import type { AppRole } from "@/domain/roles";
import { isAdminRole } from "@/domain/roles";

export const PERMISSIONS = [
  "search:read",
  "favorites:manage",
  "business:claim",
  "business:manage",
  "business:publish",
  "admin:access",
  "admin:moderate",
  "admin:merge",
  "admin:settings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  USER: ["search:read", "favorites:manage", "business:claim"],
  BUSINESS_OWNER: [
    "search:read",
    "favorites:manage",
    "business:claim",
    "business:manage",
    "business:publish",
  ],
  BUSINESS_STAFF: ["search:read", "business:manage"],
  ADMIN: [
    "search:read",
    "favorites:manage",
    "business:claim",
    "business:manage",
    "business:publish",
    "admin:access",
    "admin:moderate",
    "admin:merge",
  ],
  SUPER_ADMIN: PERMISSIONS,
};

export function hasPermission(
  roles: readonly AppRole[],
  permission: Permission,
): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function requirePermission(
  roles: readonly AppRole[],
  permission: Permission,
): void {
  if (!hasPermission(roles, permission)) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
}

export function requireAdmin(roles: readonly AppRole[]): void {
  if (!roles.some(isAdminRole)) {
    throw new Error("Forbidden: admin role required");
  }
}
