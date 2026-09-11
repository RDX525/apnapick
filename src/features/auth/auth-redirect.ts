import { safeAuthNextPath } from "@/lib/security/safe-redirect";

export function resolveOwnerHome(input: {
  requestedNext?: string | null;
  roles: readonly string[];
  hasListing: boolean;
}) {
  const fallback = input.hasListing ? "/business/dashboard" : "/business/onboarding";
  const requested = input.requestedNext
    ? safeAuthNextPath(input.requestedNext, fallback)
    : null;

  if (!requested) {
    if (input.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) {
      return "/admin";
    }
    return fallback;
  }

  if (requested.startsWith("/business/dashboard") && !input.hasListing) {
    return "/business/onboarding";
  }
  return requested;
}

/** @deprecated Use resolveOwnerHome so new owners are not sent to an empty dashboard. */
export function resolveLoginDestination(
  requestedNext: string | null,
  roles: readonly string[],
  hasListing = true,
) {
  return resolveOwnerHome({ requestedNext, roles, hasListing });
}

/** Full document load so auth cookies are sent; client `router.replace` can stall after sign-in. */
export function navigateAfterAuth(path: string) {
  window.location.assign(path);
}
