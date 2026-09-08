export const APP_ROLES = [
  "USER",
  "BUSINESS_OWNER",
  "BUSINESS_STAFF",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export function isAdminRole(role: AppRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function hasAnyAdminRole(roles: readonly AppRole[]): boolean {
  return roles.some(isAdminRole);
}
