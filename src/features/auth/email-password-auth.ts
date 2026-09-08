import {
  friendlyAuthError,
  isAuthRateLimitError,
  isDuplicateSignupUser,
  isEmailNotConfirmedError,
  isExistingUserError,
  isInvalidCredentialsError,
  SIGNUP_MAILER_RATE_LIMIT_MESSAGE,
} from "@/features/auth/auth-errors";

type AuthErrorLike = { message: string; code?: string } | null;

type SignInResult = {
  data: { session: unknown | null };
  error: AuthErrorLike;
};

type SignUpResult = {
  data: {
    session: unknown | null;
    user: { identities?: unknown[] | null } | null;
  };
  error: AuthErrorLike;
};

export type EmailAuthApi = {
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<SignInResult>;
  signUp: (credentials: {
    email: string;
    password: string;
    options?: {
      data?: Record<string, string>;
      emailRedirectTo?: string;
    };
  }) => Promise<SignUpResult>;
};

export type EmailAuthOutcome =
  | { status: "authenticated" }
  | { status: "needs_confirmation" }
  | { status: "error"; message: string };

/**
 * Create or resume an email/password session without burning confirmation emails.
 * Sign-in is tried first so retries of an existing account do not hit Supabase's
 * signup mailer rate limit.
 */
export async function establishEmailPasswordSession(
  auth: EmailAuthApi,
  input: {
    email: string;
    password: string;
    name?: string;
    emailRedirectTo?: string;
    mode: "signup" | "login";
  },
): Promise<EmailAuthOutcome> {
  const email = input.email.trim();
  const signedIn = await auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (!signedIn.error && signedIn.data.session) {
    return { status: "authenticated" };
  }

  if (isEmailNotConfirmedError(signedIn.error)) {
    return { status: "needs_confirmation" };
  }

  if (input.mode === "login") {
    return {
      status: "error",
      message: friendlyAuthError(signedIn.error, "Unable to sign in. Try again."),
    };
  }

  if (signedIn.error && !isInvalidCredentialsError(signedIn.error)) {
    return {
      status: "error",
      message: friendlyAuthError(
        signedIn.error,
        "Unable to create your account. Try again.",
      ),
    };
  }

  const signedUp = await auth.signUp({
    email,
    password: input.password,
    options: {
      data: input.name ? { display_name: input.name } : undefined,
      emailRedirectTo: input.emailRedirectTo,
    },
  });

  if (!signedUp.error && signedUp.data.session) {
    return { status: "authenticated" };
  }

  if (
    signedUp.error &&
    (isExistingUserError(signedUp.error) || isAuthRateLimitError(signedUp.error))
  ) {
    const retry = await auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (!retry.error && retry.data.session) {
      return { status: "authenticated" };
    }
    if (isEmailNotConfirmedError(retry.error)) {
      return { status: "needs_confirmation" };
    }
    if (isExistingUserError(signedUp.error)) {
      return {
        status: "error",
        message:
          "An account with this email already exists. Log in, or reset your password if you just deleted the profile.",
      };
    }
    // Mailer limits are keyed by email and survive Auth user deletion.
    if (isInvalidCredentialsError(retry.error)) {
      return {
        status: "error",
        message: SIGNUP_MAILER_RATE_LIMIT_MESSAGE,
      };
    }
    return {
      status: "error",
      message: friendlyAuthError(
        retry.error ?? signedUp.error,
        "Unable to create your account. Try again in a few minutes.",
      ),
    };
  }

  if (signedUp.error) {
    return {
      status: "error",
      message: friendlyAuthError(
        signedUp.error,
        "Unable to create your account. Try again.",
      ),
    };
  }

  if (isDuplicateSignupUser(signedUp.data.user)) {
    return {
      status: "error",
      message: "An account with this email already exists. Try logging in instead.",
    };
  }

  return { status: "needs_confirmation" };
}
