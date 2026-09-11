"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DashboardWorkspace } from "@/domain/dashboard/types";
import { buildDashboardInsights } from "@/services/dashboard/insights";
import {
  createEmptyWorkspace,
  loadWorkspaceFromStorage,
  saveWorkspaceToStorage,
  scoreWorkspaceCompleteness,
} from "@/services/dashboard/workspace";
import { hasPersistedListing } from "@/features/dashboard/section-nav";

type DashboardContextValue = {
  workspace: DashboardWorkspace;
  insights: ReturnType<typeof buildDashboardInsights>;
  hydrated: boolean;
  dirty: boolean;
  update: (mutator: (prev: DashboardWorkspace) => DashboardWorkspace) => void;
  replace: (next: DashboardWorkspace) => void;
  saveStatus: "loading" | "idle" | "saving" | "saved" | "error" | "offline";
  saveError: string | null;
  saveQueuedForReview: boolean;
  saveNow: () => Promise<boolean>;
  retrySave: () => void;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

const DEMO_BUSINESS_ID = "11111111-1111-1111-1111-111111111101";
const DEMO_SLUG = "spice-route-kitchen";

function isUsableLocalWorkspace(saved: DashboardWorkspace | null) {
  if (!saved?.profile.businessId) return false;
  if (saved.profile.businessId === DEMO_BUSINESS_ID) return false;
  if (saved.profile.slug === DEMO_SLUG) return false;
  return true;
}

function applyWorkspace(
  next: DashboardWorkspace,
  setWorkspace: (value: DashboardWorkspace) => void,
  latestWorkspace: { current: DashboardWorkspace },
) {
  setWorkspace(next);
  latestWorkspace.current = next;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<DashboardWorkspace>(() =>
    createEmptyWorkspace(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] =
    useState<DashboardContextValue["saveStatus"]>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveQueuedForReview, setSaveQueuedForReview] = useState(false);
  const activeController = useRef<AbortController | null>(null);
  const latestWorkspace = useRef(workspace);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const saved = loadWorkspaceFromStorage();
      const local = isUsableLocalWorkspace(saved) ? saved : null;

      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12_000);
        const response = await fetch("/api/business/workspace", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        }).finally(() => window.clearTimeout(timeout));
        if (!response.ok) {
          throw new Error("Couldn’t load listing");
        }
        const body = (await response.json()) as {
          workspace?: DashboardWorkspace | null;
          source?: string;
        };
        if (cancelled) return;

        if (body.workspace?.profile.businessId) {
          saveWorkspaceToStorage(body.workspace);
          applyWorkspace(body.workspace, setWorkspace, latestWorkspace);
        } else if (body.source === "supabase") {
          applyWorkspace(createEmptyWorkspace(), setWorkspace, latestWorkspace);
        } else if (local) {
          applyWorkspace(local, setWorkspace, latestWorkspace);
        } else {
          applyWorkspace(createEmptyWorkspace(), setWorkspace, latestWorkspace);
        }
      } catch {
        if (cancelled) return;
        if (local) {
          applyWorkspace(local, setWorkspace, latestWorkspace);
        }
      }

      if (!cancelled) {
        setDirty(false);
        dirtyRef.current = false;
        setHydrated(true);
        setSaveStatus("saved");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const prepare = useCallback((next: DashboardWorkspace) => {
    return {
      ...next,
      profile: {
        ...next.profile,
        completeness: scoreWorkspaceCompleteness(next),
      },
    };
  }, []);

  const saveToServer = useCallback(async (next: DashboardWorkspace) => {
    if (!hasPersistedListing(next.profile.businessId)) {
      setSaveStatus("error");
      setSaveError(
        "No listing is loaded yet. Finish onboarding, then save this section.",
      );
      return false;
    }

    if (!navigator.onLine) {
      setSaveStatus("offline");
      setSaveError("You’re offline. Changes are safe on this device.");
      return false;
    }

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    setSaveStatus("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/business/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace: next }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        persisted?: boolean;
        queuedForReview?: boolean;
        status?: DashboardWorkspace["profile"]["status"];
        completeness?: number;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Couldn’t save changes.");
      }
      if (body.persisted === false) {
        setSaveStatus("error");
        setSaveError(
          "Changes stayed on this device. Sign in again to save them to the server.",
        );
        return false;
      }

      setSaveStatus("saved");
      setSaveError(null);
      setDirty(false);
      dirtyRef.current = false;
      setSaveQueuedForReview(Boolean(body.queuedForReview));
      const current = latestWorkspace.current;
      const nextStatus = body.status ?? current.profile.status;
      const nextCompleteness = body.completeness ?? current.profile.completeness;
      const nextOwnerEditPending =
        nextStatus === "PUBLISHED" && Boolean(body.queuedForReview);
      if (
        nextStatus !== current.profile.status ||
        nextOwnerEditPending !== current.profile.ownerEditPending ||
        nextCompleteness !== current.profile.completeness
      ) {
        const patched = {
          ...current,
          profile: {
            ...current.profile,
            status: nextStatus,
            completeness: nextCompleteness,
            ownerEditPending: nextOwnerEditPending,
          },
        };
        applyWorkspace(patched, setWorkspace, latestWorkspace);
        saveWorkspaceToStorage(patched);
      }
      return true;
    } catch (err) {
      const superseded = activeController.current !== controller;
      if (controller.signal.aborted && superseded) return false;
      setSaveStatus(navigator.onLine ? "error" : "offline");
      setSaveError(
        !navigator.onLine
          ? "You’re offline. Changes are safe on this device."
          : controller.signal.aborted
            ? "Saving took too long. Try again."
            : err instanceof Error
              ? err.message
              : "Couldn’t save changes.",
      );
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  const saveNow = useCallback(async () => {
    const next = {
      ...latestWorkspace.current,
      updatedAt: new Date().toISOString(),
    };
    latestWorkspace.current = next;
    saveWorkspaceToStorage(next);
    return saveToServer(next);
  }, [saveToServer]);

  useEffect(() => {
    const handleOffline = () => {
      activeController.current?.abort();
      setSaveStatus("offline");
      setSaveError("You’re offline. Changes are safe on this device.");
    };
    const handleOnline = () => {
      if (dirty) setSaveStatus("idle");
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      activeController.current?.abort();
    };
  }, [dirty]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const update = useCallback(
    (mutator: (prev: DashboardWorkspace) => DashboardWorkspace) => {
      setWorkspace((prev) => {
        const next = prepare(mutator(prev));
        latestWorkspace.current = next;
        saveWorkspaceToStorage(next);
        return next;
      });
      setDirty(true);
      dirtyRef.current = true;
      setSaveStatus(navigator.onLine ? "idle" : "offline");
      setSaveError(
        navigator.onLine ? null : "You’re offline. Changes are safe on this device.",
      );
    },
    [prepare],
  );

  const replace = useCallback(
    (next: DashboardWorkspace) => {
      const prepared = prepare(next);
      latestWorkspace.current = prepared;
      saveWorkspaceToStorage(prepared);
      setWorkspace(prepared);
      setDirty(true);
      dirtyRef.current = true;
      setSaveStatus("idle");
    },
    [prepare],
  );

  const insights = useMemo(() => buildDashboardInsights(workspace), [workspace]);

  const value = useMemo(
    () => ({
      workspace,
      insights,
      hydrated,
      dirty,
      update,
      replace,
      saveStatus,
      saveError,
      saveQueuedForReview,
      saveNow,
      retrySave: () => {
        void saveNow();
      },
    }),
    [
      workspace,
      insights,
      hydrated,
      dirty,
      update,
      replace,
      saveStatus,
      saveError,
      saveQueuedForReview,
      saveNow,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return ctx;
}
