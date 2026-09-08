import { safeAuthNextPath } from "@/lib/security/safe-redirect";

export function resolveLoginDestination(
  requestedNext: string | null,
  roles: readonly string[],
) {
  if (requestedNext) {
    return safeAuthNextPath(requestedNext, "/business/dashboard");
  }
  return roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")
    ? "/admin"
    : "/business/dashboard";
}
