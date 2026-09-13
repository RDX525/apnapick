import { safeAuthNextPath } from "@/lib/security/safe-redirect";

/**
 * True when auth was started to leave a review (or other consumer return to a listing),
 * not to list/manage a business.
 */
export function isReviewerAuthIntent(input: {
  next?: string | null;
  intent?: string | null;
}): boolean {
  if (input.intent === "review") return true;
  const next = input.next?.trim() ?? "";
  if (!next) return false;
  const safe = safeAuthNextPath(next, "/");
  const path = safe.split("?")[0] ?? safe;
  return path === "/b" || path.startsWith("/b/");
}

export function reviewerReturnPath(next: string | null | undefined): string {
  if (!next) return "/";
  return safeAuthNextPath(next, "/");
}
