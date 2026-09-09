/** True when the browser still has a Supabase auth cookie. */
export function hasBrowserAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0] ?? "";
    return name.startsWith("sb-") && name.includes("auth-token");
  });
}
