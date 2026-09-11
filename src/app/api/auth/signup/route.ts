import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { hasSupabaseConfig } from "@/config/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseRegisterEmailUser } from "@/services/auth/register-user";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anon"
  );
}

/**
 * Rate-limit signup, then let the browser `signUp` send the confirmation email.
 * Do not admin-create users; that skipped email verification.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseConfig()) {
      throw new AppError({
        message: "Account creation is temporarily unavailable.",
        code: "AUTH_UNAVAILABLE",
        status: 503,
        expose: true,
      });
    }

    const input = parseRegisterEmailUser(await request.json());
    const ip = clientIp(request);
    const ipLimit = await rateLimit(`auth:signup:${ip}`, 8, 60 * 60 * 1000);
    const emailLimit = await rateLimit(
      `auth:signup:email:${input.email.toLowerCase()}`,
      6,
      60 * 60 * 1000,
    );
    if (!ipLimit.allowed || !emailLimit.allowed) {
      throw new AppError({
        message: "Too many account attempts. Wait a few minutes, then try again.",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    return jsonOk({ fallback: true });
  } catch (error) {
    return jsonError(error);
  }
}
