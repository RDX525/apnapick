const AUTH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export function isBusinessOnboardingPath(pathname: string) {
  return (
    pathname === "/business/onboarding" || pathname.startsWith("/business/onboarding/")
  );
}

/** Owner dashboard and admin — not the public List your business flow. */
export function isWorkspacePath(pathname: string) {
  if (isBusinessOnboardingPath(pathname)) return false;
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/business" ||
    pathname.startsWith("/business/")
  );
}

/** Auth and workspace screens hide the public header/footer. */
export function isFocusedPath(pathname: string) {
  if (isBusinessOnboardingPath(pathname)) return false;
  if (isWorkspacePath(pathname)) return true;
  return AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
