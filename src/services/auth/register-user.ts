import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { createAdminClient } from "@/lib/db/supabase-admin";
import {
  isAuthRateLimitError,
  isExistingUserError,
  SIGNUP_MAILER_RATE_LIMIT_MESSAGE,
} from "@/features/auth/auth-errors";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger({ module: "register-user" });

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().max(80).optional(),
});

export type RegisterEmailUserInput = z.infer<typeof registerSchema>;

export function parseRegisterEmailUser(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError({
      message: "Enter a valid email and a password with at least 8 characters.",
      code: "VALIDATION_ERROR",
      status: 400,
      expose: true,
    });
  }
  return parsed.data;
}

export async function registerEmailUser(input: RegisterEmailUserInput) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.name ? { display_name: input.name } : undefined,
  });

  if (!error) return { status: "created" as const };
  log.warn("admin_create_user_failed", {
    code: error.code,
    message: error.message,
  });
  if (isExistingUserError(error)) return { status: "exists" as const };
  if (isAuthRateLimitError(error)) {
    throw new AppError({
      message: SIGNUP_MAILER_RATE_LIMIT_MESSAGE,
      code: "AUTH_RATE_LIMITED",
      status: 429,
      expose: true,
    });
  }

  throw new AppError({
    message: "Unable to create your account. Try again in a few minutes.",
    code: "AUTH_SIGNUP_FAILED",
    status: 400,
    expose: true,
  });
}
