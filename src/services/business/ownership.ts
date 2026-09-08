import type { AppRole } from "@/domain/roles";
import { isAdminRole } from "@/domain/roles";

export type BusinessMemberRole = "OWNER" | "STAFF";

export type BusinessMembership = {
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
  permissions?: string[];
};

export type OwnershipAuditEvent = {
  action:
    | "member_added"
    | "member_removed"
    | "role_changed"
    | "claim_verified"
    | "ownership_transferred";
  businessId: string;
  actorId: string;
  subjectUserId?: string;
  fromRole?: string | null;
  toRole?: string | null;
  at: string;
  meta?: Record<string, unknown>;
};

/**
 * Server-side ownership checks. Never trust client-side role claims.
 * Owners always manage; staff only with assigned permissions; admins always.
 */
export function canManageBusiness(input: {
  userId: string;
  roles: readonly AppRole[];
  membership: BusinessMembership | null;
}): boolean {
  if (input.roles.some(isAdminRole)) return true;
  if (!input.membership || input.membership.userId !== input.userId) {
    return false;
  }
  if (input.membership.role === "OWNER") return true;
  if (input.membership.role === "STAFF") {
    const perms = input.membership.permissions ?? [];
    return perms.includes("manage_profile") || perms.includes("manage_all");
  }
  return false;
}

export function requireBusinessAccess(input: {
  userId: string;
  roles: readonly AppRole[];
  membership: BusinessMembership | null;
}): void {
  if (!canManageBusiness(input)) {
    throw new Error("Forbidden: no access to this business");
  }
}

/** Every ownership change must be audited. */
export function recordOwnershipChange(
  events: OwnershipAuditEvent[],
  event: Omit<OwnershipAuditEvent, "at"> & { at?: string },
): OwnershipAuditEvent {
  const full: OwnershipAuditEvent = {
    ...event,
    at: event.at ?? new Date().toISOString(),
  };
  events.push(full);
  return full;
}
