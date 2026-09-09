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

type DashboardContextValue = {
  workspace: DashboardWorkspace;
  insights: ReturnType<typeof buildDashboardInsights>;
  hydrated: boolean;
  update: (mutator: (prev: DashboardWorkspace) => DashboardWorkspace) => void;
  replace: (next: DashboardWorkspace) => void;
  saveStatus: "loading" | "idle" | "saving" | "saved" | "error" | "offline";
  saveError: string | null;
  saveQueuedForReview: boolean;
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
  const [saveStatus, setSaveStatus] =
    useState<DashboardContextValue["saveStatus"]>("loading");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveQueuedForReview, setSaveQueuedForReview] = useState(false);
  const skipInitialPersist = useRef(true);
  const skipNextPersist = useRef(false);
  const requestSequence = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const latestWorkspace = useRef(workspace);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const saved = loadWorkspaceFromStorage();
      const local = isUsableLocalWorkspace(saved) ? saved : null;

      try {
        const response = await fetch("/api/business/workspace", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
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

  const saveToServer = useCallback(
    async (next: DashboardWorkspace, sequence: number, controller: AbortController) => {
      if (!navigator.onLine) {
        if (sequence === requestSequence.current) {
          setSaveStatus("offline");
          setSaveError("You’re offline. Changes are safe on this device.");
        }
        return;
      }

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
        if (sequence === requestSequence.current) {
          setSaveStatus("saved");
          setSaveError(null);
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
            skipNextPersist.current = true;
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
        }
      } catch (err) {
        if (controller.signal.aborted || sequence !== requestSequence.current) {
          return;
        }
        setSaveStatus(navigator.onLine ? "error" : "offline");
        setSaveError(
          navigator.onLine
            ? err instanceof Error
              ? err.message
              : "Couldn’t save changes."
            : "You’re offline. Changes are safe on this device.",
        );
      }
    },
    [],
  );

  const retrySave = useCallback(() => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const sequence = ++requestSequence.current;
    const next = {
      ...latestWorkspace.current,
      updatedAt: new Date().toISOString(),
    };
    saveWorkspaceToStorage(next);
    void saveToServer(next, sequence, controller);
  }, [saveToServer]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipInitialPersist.current) {
      skipInitialPersist.current = false;
      return;
    }
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    const controller = new AbortController();
    activeController.current?.abort();
    activeController.current = controller;
    const sequence = ++requestSequence.current;
    const scored = {
      ...workspace,
      updatedAt: new Date().toISOString(),
    };
    latestWorkspace.current = scored;
    setSaveStatus(navigator.onLine ? "idle" : "offline");
    setSaveError(
      navigator.onLine ? null : "You’re offline. Changes are safe on this device.",
    );

    const timeout = window.setTimeout(() => {
      saveWorkspaceToStorage(scored);
      void saveToServer(scored, sequence, controller);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [hydrated, saveToServer, workspace]);

  useEffect(() => {
    const handleOffline = () => {
      activeController.current?.abort();
      requestSequence.current += 1;
      setSaveStatus("offline");
      setSaveError("You’re offline. Changes are safe on this device.");
    };
    const handleOnline = () => retrySave();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      activeController.current?.abort();
    };
  }, [retrySave]);

  const update = useCallback(
    (mutator: (prev: DashboardWorkspace) => DashboardWorkspace) => {
      setWorkspace((prev) => prepare(mutator(prev)));
    },
    [prepare],
  );

  const replace = useCallback(
    (next: DashboardWorkspace) => {
      setWorkspace(prepare(next));
    },
    [prepare],
  );

  const insights = useMemo(() => buildDashboardInsights(workspace), [workspace]);

  const value = useMemo(
    () => ({
      workspace,
      insights,
      hydrated,
      update,
      replace,
      saveStatus,
      saveError,
      saveQueuedForReview,
      retrySave,
    }),
    [
      workspace,
      insights,
      hydrated,
      update,
      replace,
      saveStatus,
      saveError,
      saveQueuedForReview,
      retrySave,
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
