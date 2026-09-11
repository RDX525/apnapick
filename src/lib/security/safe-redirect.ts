/**
 * Safe relative redirects after auth. Rejects open redirects.
 * Allows any same-origin path starting with a single `/`.
 */
const AUTH_NEXT_FALLBACKS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
];

function isAuthRoute(path: string) {
  const pathname = path.split("?")[0] ?? path;
  return AUTH_NEXT_FALLBACKS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function safeAuthNextPath(
  raw: string | null | undefined,
  fallback = "/business/onboarding",
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  if (trimmed.includes("\\") || trimmed.includes("://")) {
    return fallback;
  }
  // Reject encoded tricks like /%2f%2fevil.com
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith("//") || /^[a-z]+:/i.test(decoded)) {
      return fallback;
    }
    if (isAuthRoute(decoded) || isAuthRoute(trimmed)) {
      return fallback;
    }
  } catch {
    return fallback;
  }
  return trimmed;
}
