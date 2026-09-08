export function friendlyAuthError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "The email or password is incorrect.";
  }
  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed")
  ) {
    return "Confirm your email before signing in.";
  }
  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (normalized.includes("password") && normalized.includes("weak")) {
    return "Choose a stronger password with at least 8 characters.";
  }
  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "Too many attempts. Wait a few minutes, then try again.";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed")
  ) {
    return "We couldn’t reach the sign-in service. Check your connection and try again.";
  }
  if (
    normalized.includes("session") ||
    normalized.includes("refresh token") ||
    normalized.includes("otp expired")
  ) {
    return "This secure link has expired. Request a new one.";
  }

  return fallback;
}
