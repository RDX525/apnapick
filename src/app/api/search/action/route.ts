import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { searchActionSchema } from "@/lib/validations/search";
import { getSearchAnalyticsService } from "@/services/search/get-search-service";

export const dynamic = "force-dynamic";

/** Record click / call / directions without storing precise GPS. */
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anon";

    const limited = await rateLimit(`search-action:${ip}`, 120, 60_000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = searchActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid action payload",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    await getSearchAnalyticsService().recordAction({
      businessId: parsed.data.businessId,
      action: parsed.data.action,
      searchEventId: parsed.data.searchEventId,
      areaSlug: parsed.data.areaSlug,
      sessionId: parsed.data.sessionId,
      queryNormalized: parsed.data.queryNormalized,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
