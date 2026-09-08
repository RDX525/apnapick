import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { hasServiceRoleKey, hasSupabaseConfig } from "@/config/env";
import { createLogger } from "@/lib/logging/logger";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseRegisterEmailUser, registerEmailUser } from "@/services/auth/register-user";

const log = createLogger({ module: "auth-signup" });

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "anon"
  );
}

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

    if (!hasServiceRoleKey()) {
      log.warn("signup_missing_service_role", {
        hint: "Client signUp will send confirmation email and can hit per-address rate limits.",
      });
      return jsonOk({ fallback: true });
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

    const result = await registerEmailUser(input);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
