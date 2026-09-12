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
import type { AdminWorkspace } from "@/domain/admin/types";
import { createEmptyAdminWorkspace } from "@/services/admin/workspace";
import {
  appendLocalAudit,
  applyAdminWorkspaceSnapshot,
  applyBusinessAction,
  applyClaimAction,
  applyUserAction,
  auditEntryFromAction,
  removeAdminContentItem,
} from "@/services/admin/actions";
import type {
  BusinessAdminAction,
  ClaimAdminAction,
  UserAdminAction,
} from "@/domain/admin/types";

type AdminContextValue = {
  workspace: AdminWorkspace;
  hydrated: boolean;
  saving: boolean;
  actionError: string | null;
  pendingActions: ReadonlySet<string>;
  clearActionError: () => void;
  runClaimAction: (
    claimId: string,
    action: ClaimAdminAction,
    note?: string,
  ) => Promise<void>;
  runBusinessAction: (
    businessId: string,
    action: BusinessAdminAction,
    mergeIntoId?: string,
  ) => Promise<void>;
  runUserAction: (userId: string, action: UserAdminAction) => Promise<void>;
  moderateContent: (
    id: string,
    kind: "product" | "service" | "photo" | "description" | "review",
    status: "visible" | "hidden" | "flagged" | "deleted",
  ) => Promise<void>;
  resolveReport: (
    id: string,
    status: "RESOLVED" | "DISMISSED" | "IN_REVIEW",
  ) => Promise<void>;
  toggleCategory: (id: string) => Promise<void>;
  toggleSeoIndex: (id: string) => Promise<void>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

async function postAdminAction(body: Record<string, unknown>) {
  const res = await fetch("/api/admin/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error ?? "Admin action failed");
  }
  return res.json() as Promise<{
    audit?: {
      id: string;
      action: string;
      createdAt: string;
      actorEmail?: string | null;
    };
  }>;
}

const LIVE_POLL_MS = 5_000;

function workspacePayloadKey(body: Partial<AdminWorkspace>) {
  return JSON.stringify([
    body.businesses,
    body.claims,
    body.users,
    body.categories,
    body.reports,
    body.auditLogs,
    body.content,
    body.searchAnalytics,
    body.seoPages,
    body.subscriptions,
    body.payments,
  ]);
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState(createEmptyAdminWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const saving = pendingActions.size > 0;
  const pendingActionsRef = useRef(pendingActions);
  pendingActionsRef.current = pendingActions;
  const mutationEpochRef = useRef(0);
  const loadApprovalsRef = useRef<() => Promise<void>>(async () => {});
  const lastPayloadKeyRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let inFlight: AbortController | null = null;

    async function loadApprovals() {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const epochAtStart = mutationEpochRef.current;
      try {
        const response = await fetch("/api/admin/approvals", {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await response
          .json()
          .catch(() => ({}))) as Partial<AdminWorkspace> & {
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Could not load approval queues");
        if (cancelled) return;
        setActionError(null);
        const stale =
          pendingActionsRef.current.size > 0 ||
          epochAtStart !== mutationEpochRef.current;
        const payloadKey = workspacePayloadKey(body);
        if (!stale && payloadKey === lastPayloadKeyRef.current) {
          setHydrated(true);
          return;
        }
        if (!stale) lastPayloadKeyRef.current = payloadKey;
        setWorkspace((previous) =>
          applyAdminWorkspaceSnapshot(previous, body, {
            hasPendingActions: stale,
          }),
        );
        setHydrated(true);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (cancelled) return;
        setActionError(
          error instanceof Error ? error.message : "Could not load approval queues",
        );
        setHydrated(true);
      }
    }

    loadApprovalsRef.current = loadApprovals;
    void loadApprovals();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadApprovals();
    }, LIVE_POLL_MS);
    const onResume = () => {
      if (document.visibilityState === "visible") void loadApprovals();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      cancelled = true;
      inFlight?.abort();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, []);

  const runTracked = useCallback(async (key: string, work: () => Promise<void>) => {
    setActionError(null);
    setPendingActions((current) => {
      const next = new Set(current).add(key);
      pendingActionsRef.current = next;
      return next;
    });
    try {
      await work();
      mutationEpochRef.current += 1;
      queueMicrotask(() => {
        void loadApprovalsRef.current();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "The admin action failed.";
      setActionError(message);
      throw err;
    } finally {
      setPendingActions((current) => {
        const next = new Set(current);
        next.delete(key);
        pendingActionsRef.current = next;
        return next;
      });
    }
  }, []);

  const runClaimAction = useCallback(
    async (claimId: string, action: ClaimAdminAction, note?: string) => {
      await runTracked(`claim:${claimId}:${action}`, async () => {
        const result = await postAdminAction({
          type: "claim",
          claimId,
          action,
          note,
        });
        setWorkspace((prev) => {
          const claim = prev.claims.find((c) => c.id === claimId);
          if (!claim) return prev;
          const updated = applyClaimAction(claim, action, "admin", note);
          let next: AdminWorkspace = {
            ...prev,
            claims: prev.claims.map((c) => (c.id === claimId ? updated : c)),
          };
          if (action === "approve" || action === "verify") {
            next = {
              ...next,
              businesses: next.businesses.map((b) =>
                b.id === claim.businessId
                  ? {
                      ...b,
                      isClaimed: true,
                      verifiedAt: new Date().toISOString(),
                      status: "PUBLISHED",
                    }
                  : b,
              ),
            };
          }
          next = appendLocalAudit(
            next,
            auditEntryFromAction(result, {
              action: `claim_${action}`,
              entityType: "business_claim",
              entityId: claimId,
            }),
          );
          return next;
        });
      });
    },
    [runTracked],
  );

  const runBusinessAction = useCallback(
    async (businessId: string, action: BusinessAdminAction, mergeIntoId?: string) => {
      await runTracked(`business:${businessId}:${action}`, async () => {
        const result = await postAdminAction({
          type: "business",
          businessId,
          action,
          mergeIntoId,
        });
        setWorkspace((prev) => {
          let next = applyBusinessAction(prev, businessId, action, mergeIntoId);
          next = appendLocalAudit(
            next,
            auditEntryFromAction(result, {
              action: `business_${action}`,
              entityType: "business",
              entityId: businessId,
            }),
          );
          return next;
        });
      });
    },
    [runTracked],
  );

  const runUserAction = useCallback(
    async (userId: string, action: UserAdminAction) => {
      await runTracked(`user:${userId}:${action}`, async () => {
        const result = await postAdminAction({
          type: "user",
          userId,
          action,
        });
        setWorkspace((prev) => {
          let next = applyUserAction(prev, userId, action);
          next = appendLocalAudit(
            next,
            auditEntryFromAction(result, {
              action: `user_${action}`,
              entityType: "user",
              entityId: userId,
            }),
          );
          return next;
        });
      });
    },
    [runTracked],
  );

  const moderateContent = useCallback(
    async (
      id: string,
      kind: "product" | "service" | "photo" | "description" | "review",
      status: "visible" | "hidden" | "flagged" | "deleted",
    ) => {
      await runTracked(`content:${id}:${status}`, async () => {
        const result = await postAdminAction({
          type: "content",
          contentId: id,
          contentKind: kind,
          status,
        });
        setWorkspace((prev) => {
          let next: AdminWorkspace =
            status === "deleted"
              ? removeAdminContentItem(prev, id)
              : {
                  ...prev,
                  content: prev.content.map((c) =>
                    c.id === id ? { ...c, status } : c,
                  ),
                };
          next = appendLocalAudit(
            next,
            auditEntryFromAction(result, {
              action: `content_${status}`,
              entityType: "content",
              entityId: id,
            }),
          );
          return next;
        });
      });
    },
    [runTracked],
  );

  const resolveReport = useCallback(
    async (id: string, status: "RESOLVED" | "DISMISSED" | "IN_REVIEW") => {
      await runTracked(`report:${id}:${status}`, async () => {
        const result = await postAdminAction({
          type: "report",
          reportId: id,
          status,
        });
        setWorkspace((prev) => {
          let next: AdminWorkspace = {
            ...prev,
            reports: prev.reports.map((r) => (r.id === id ? { ...r, status } : r)),
          };
          next = appendLocalAudit(
            next,
            auditEntryFromAction(result, {
              action: `report_${status.toLowerCase()}`,
              entityType: "report",
              entityId: id,
            }),
          );
          return next;
        });
      });
    },
    [runTracked],
  );

  const toggleCategory = useCallback(
    async (id: string) => {
      const cat = workspace.categories.find((c) => c.id === id);
      if (!cat) return;
      const active = !cat.active;
      await runTracked(
        `category:${id}:${active ? "activate" : "deactivate"}`,
        async () => {
          const result = await postAdminAction({
            type: "category",
            categoryId: id,
            active,
          });
          setWorkspace((prev) => {
            let next: AdminWorkspace = {
              ...prev,
              categories: prev.categories.map((c) =>
                c.id === id ? { ...c, active } : c,
              ),
            };
            next = appendLocalAudit(
              next,
              auditEntryFromAction(result, {
                action: active ? "category_activate" : "category_deactivate",
                entityType: "category",
                entityId: id,
              }),
            );
            return next;
          });
        },
      );
    },
    [runTracked, workspace.categories],
  );

  const toggleSeoIndex = useCallback(
    async (id: string) => {
      const page = workspace.seoPages.find((p) => p.id === id);
      if (!page) return;
      const indexable = !page.indexable;
      await runTracked(`seo:${id}:${indexable ? "index" : "noindex"}`, async () => {
        const result = await postAdminAction({
          type: "seo",
          pageId: id,
          indexable,
        });
        setWorkspace((prev) => {
          let next: AdminWorkspace = {
            ...prev,
            seoPages: prev.seoPages.map((p) => (p.id === id ? { ...p, indexable } : p)),
          };
          next = appendLocalAudit(
            next,
            auditEntryFromAction(result, {
              action: indexable ? "seo_index" : "seo_noindex",
              entityType: "seo_page",
              entityId: id,
            }),
          );
          return next;
        });
      });
    },
    [runTracked, workspace.seoPages],
  );

  const value = useMemo(
    () => ({
      workspace,
      hydrated,
      saving,
      actionError,
      pendingActions,
      clearActionError: () => setActionError(null),
      runClaimAction,
      runBusinessAction,
      runUserAction,
      moderateContent,
      resolveReport,
      toggleCategory,
      toggleSeoIndex,
    }),
    [
      workspace,
      hydrated,
      saving,
      actionError,
      pendingActions,
      runClaimAction,
      runBusinessAction,
      runUserAction,
      moderateContent,
      resolveReport,
      toggleCategory,
      toggleSeoIndex,
    ],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
