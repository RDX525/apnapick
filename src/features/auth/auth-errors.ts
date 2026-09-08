function authErrorParts(error: unknown): { message: string; code: string; text: string } {
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; code?: unknown };
    const message =
      typeof candidate.message === "string" ? candidate.message : String(error);
    const code = typeof candidate.code === "string" ? candidate.code : "";
    return { message, code, text: `${code} ${message}`.trim().toLowerCase() };
  }
  const message = String(error ?? "");
  return { message, code: "", text: message.toLowerCase() };
}

export function isInvalidCredentialsError(error: unknown) {
  const { text } = authErrorParts(error);
  return (
    text.includes("invalid login credentials") ||
    text.includes("invalid credentials") ||
    text.includes("invalid_credentials") ||
    text.includes("user not found")
  );
}

export function isEmailNotConfirmedError(error: unknown) {
  const { text } = authErrorParts(error);
  return text.includes("email not confirmed") || text.includes("email_not_confirmed");
}

export function isExistingUserError(error: unknown) {
  const { text } = authErrorParts(error);
  return (
    text.includes("email_exists") ||
    text.includes("identity_already_exists") ||
    text.includes("user already registered") ||
    text.includes("already been registered") ||
    text.includes("already registered")
  );
}

export const SIGNUP_MAILER_RATE_LIMIT_MESSAGE =
  "Too many confirmation emails were sent to this address. Try a different email, or wait about an hour and try again.";

export function isAuthRateLimitError(error: unknown) {
  const { text } = authErrorParts(error);
  return (
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("over_email_send_rate_limit") ||
    text.includes("over_request_rate_limit") ||
    text.includes("for security purposes") ||
    text.includes("email rate limit exceeded")
  );
}

export function isDuplicateSignupUser(
  user: {
    identities?: unknown[] | null;
  } | null,
) {
  return Boolean(user && (user.identities?.length ?? 0) === 0);
}

export function friendlyAuthError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isInvalidCredentialsError(error)) {
    return "The email or password is incorrect.";
  }
  if (isEmailNotConfirmedError(error)) {
    return "Confirm your email before signing in. Check your inbox (and spam) for the link.";
  }
  if (isExistingUserError(error)) {
    return "An account with this email already exists. Try logging in instead.";
  }

  const { text } = authErrorParts(error);
  if (text.includes("password") && text.includes("weak")) {
    return "Choose a stronger password with at least 8 characters.";
  }
  if (isAuthRateLimitError(error)) {
    return SIGNUP_MAILER_RATE_LIMIT_MESSAGE;
  }
  if (
    text.includes("network") ||
    text.includes("failed to fetch") ||
    text.includes("fetch failed")
  ) {
    return "We couldn’t reach the sign-in service. Check your connection and try again.";
  }
  if (
    text.includes("session") ||
    text.includes("refresh token") ||
    text.includes("otp expired")
  ) {
    return "This secure link has expired. Request a new one.";
  }

  return fallback;
}
