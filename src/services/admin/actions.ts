import type {
  AdminClaim,
  AdminWorkspace,
  BusinessAdminAction,
  ClaimAdminAction,
  UserAdminAction,
} from "@/domain/admin/types";
import type { BusinessStatus, ClaimStatus } from "@/domain/business/types";

export function applyClaimAction(
  claim: AdminClaim,
  action: ClaimAdminAction,
  actorLabel: string,
  note?: string,
): AdminClaim {
  const historyEntry = {
    at: new Date().toISOString(),
    action,
    by: actorLabel,
    note,
  };

  const statusMap: Record<ClaimAdminAction, ClaimStatus> = {
    approve: "VERIFIED",
    verify: "VERIFIED",
    reject: "REJECTED",
    request_more_info: "UNDER_REVIEW",
    suspend: "REJECTED",
  };

  return {
    ...claim,
    status: statusMap[action],
    notes: note ?? claim.notes,
    history: [...claim.history, historyEntry],
  };
}

export function applyBusinessAction(
  workspace: AdminWorkspace,
  businessId: string,
  action: BusinessAdminAction,
  mergeIntoId?: string,
): AdminWorkspace {
  const statusMap: Partial<Record<BusinessAdminAction, BusinessStatus>> = {
    approve: "PUBLISHED",
    reject: "REJECTED",
    suspend: "SUSPENDED",
    verify: "PUBLISHED",
  };

  let businesses = workspace.businesses.map((b) => {
    if (b.id !== businessId) return b;
    if (action === "verify") {
      return {
        ...b,
        status: "PUBLISHED" as const,
        isClaimed: true,
        verifiedAt: new Date().toISOString(),
        ownerEditPending: false,
      };
    }
    if (action === "edit") return { ...b, ownerEditPending: false };
    if (action === "merge_duplicate") {
      return { ...b, status: "MERGED" as const };
    }
    const nextStatus = statusMap[action];
    return nextStatus
      ? {
          ...b,
          status: nextStatus,
          ownerEditPending: action === "approve" ? false : b.ownerEditPending,
        }
      : b;
  });

  if (action === "merge_duplicate" && mergeIntoId) {
    businesses = businesses.map((b) =>
      b.id === mergeIntoId ? { ...b, reportCount: Math.max(0, b.reportCount - 1) } : b,
    );
  }

  return { ...workspace, businesses };
}

export function applyUserAction(
  workspace: AdminWorkspace,
  userId: string,
  action: UserAdminAction,
): AdminWorkspace {
  return {
    ...workspace,
    users: workspace.users.map((u) =>
      u.id === userId
        ? {
            ...u,
            status: action === "suspend" ? "suspended" : "active",
          }
        : u,
    ),
  };
}

export function appendLocalAudit(
  workspace: AdminWorkspace,
  entry: AdminWorkspace["auditLogs"][number],
): AdminWorkspace {
  return {
    ...workspace,
    auditLogs: [entry, ...workspace.auditLogs].slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
}
