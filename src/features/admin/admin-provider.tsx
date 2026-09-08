"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdminWorkspace } from "@/domain/admin/types";
import {
  createEmptyAdminWorkspace,
  saveAdminWorkspace,
} from "@/services/admin/workspace";
import {
  appendLocalAudit,
  applyBusinessAction,
  applyClaimAction,
  applyUserAction,
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
    status: "visible" | "hidden" | "flagged",
  ) => Promise<void>;
  resolveReport: (
    id: string,
    status: "RESOLVED" | "DISMISSED" | "IN_REVIEW",
  ) => Promise<void>;
  toggleCategory: (id: string) => Promise<void>;
  toggleSeoIndex: (id: string) => Promise<void>;
  replace: (next: AdminWorkspace) => void;
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
    data?: { audit?: { id: string; action: string; createdAt: string } };
  }>;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState(createEmptyAdminWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const saving = pendingActions.size > 0;

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/approvals", { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as Partial<AdminWorkspace> & {
          error?: string;
        };
        if (!response.ok) throw new Error(body.error ?? "Could not load approval queues");
        setWorkspace({
          ...createEmptyAdminWorkspace(),
          ...body,
          updatedAt: new Date().toISOString(),
        });
        setHydrated(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setActionError(
          error instanceof Error ? error.message : "Could not load approval queues",
        );
        setHydrated(true);
      });

    return () => controller.abort();
  }, []);

  const persist = useCallback((next: AdminWorkspace) => {
    saveAdminWorkspace(next);
    setWorkspace(next);
  }, []);

  const runTracked = useCallback(async (key: string, work: () => Promise<void>) => {
    setActionError(null);
    setPendingActions((current) => new Set(current).add(key));
    try {
      await work();
    } catch (err) {
      const message = err instanceof Error ? err.message : "The admin action failed.";
      setActionError(message);
      throw err;
    } finally {
      setPendingActions((current) => {
        const next = new Set(current);
        next.delete(key);
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
          next = appendLocalAudit(next, {
            id: result.data?.audit?.id ?? crypto.randomUUID(),
            action: `claim_${action}`,
            entityType: "business_claim",
            entityId: claimId,
            actorEmail: "admin",
            createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
          });
          saveAdminWorkspace(next);
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
          next = appendLocalAudit(next, {
            id: result.data?.audit?.id ?? crypto.randomUUID(),
            action: `business_${action}`,
            entityType: "business",
            entityId: businessId,
            actorEmail: "admin",
            createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
          });
          saveAdminWorkspace(next);
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
          let next = action === "view" ? prev : applyUserAction(prev, userId, action);
          next = appendLocalAudit(next, {
            id: result.data?.audit?.id ?? crypto.randomUUID(),
            action: `user_${action}`,
            entityType: "user",
            entityId: userId,
            actorEmail: "admin",
            createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
          });
          saveAdminWorkspace(next);
          return next;
        });
      });
    },
    [runTracked],
  );

  const moderateContent = useCallback(
    async (id: string, status: "visible" | "hidden" | "flagged") => {
      await runTracked(`content:${id}:${status}`, async () => {
        const result = await postAdminAction({
          type: "content",
          contentId: id,
          status,
        });
        setWorkspace((prev) => {
          let next: AdminWorkspace = {
            ...prev,
            content: prev.content.map((c) => (c.id === id ? { ...c, status } : c)),
          };
          next = appendLocalAudit(next, {
            id: result.data?.audit?.id ?? crypto.randomUUID(),
            action: `content_${status}`,
            entityType: "content",
            entityId: id,
            actorEmail: "admin",
            createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
          });
          saveAdminWorkspace(next);
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
          next = appendLocalAudit(next, {
            id: result.data?.audit?.id ?? crypto.randomUUID(),
            action: `report_${status.toLowerCase()}`,
            entityType: "report",
            entityId: id,
            actorEmail: "admin",
            createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
          });
          saveAdminWorkspace(next);
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
            next = appendLocalAudit(next, {
              id: result.data?.audit?.id ?? crypto.randomUUID(),
              action: active ? "category_activate" : "category_deactivate",
              entityType: "category",
              entityId: id,
              actorEmail: "admin",
              createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
            });
            saveAdminWorkspace(next);
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
          next = appendLocalAudit(next, {
            id: result.data?.audit?.id ?? crypto.randomUUID(),
            action: indexable ? "seo_index" : "seo_noindex",
            entityType: "seo_page",
            entityId: id,
            actorEmail: "admin",
            createdAt: result.data?.audit?.createdAt ?? new Date().toISOString(),
          });
          saveAdminWorkspace(next);
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
      replace: persist,
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
      persist,
    ],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
