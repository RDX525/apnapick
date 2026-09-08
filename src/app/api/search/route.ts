import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getPublicEnv } from "@/config/env";
import { isFeatureEnabled } from "@/config/feature-flags";
import { rateLimit } from "@/lib/security/rate-limit";
import { sanitizeSearchQuery } from "@/lib/security/sanitize";
import { searchQuerySchema } from "@/validations";
import { searchWithPlacements } from "@/services/search/get-search-service";
import { createLogger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

const log = createLogger({ route: "api.search" });

export async function GET(request: NextRequest) {
  try {
    if (!isFeatureEnabled("searchEnabled")) {
      throw new AppError({
        message: "Search is disabled",
        code: "FEATURE_DISABLED",
        status: 503,
        expose: true,
      });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anon";

    const limited = await rateLimit(`search:${ip}`, 60, 60_000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = searchQuerySchema.safeParse(params);
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid search parameters",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    const env = getPublicEnv();
    const q = sanitizeSearchQuery(parsed.data.q);
    if (!q) {
      throw new AppError({
        message: "Search query is required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }
    log.info("search_request", { q, ip });

    const data = parsed.data;
    const result = await searchWithPlacements({
      query: q,
      location: {
        lat: data.lat ?? env.NEXT_PUBLIC_DEFAULT_LAT,
        lng: data.lng ?? env.NEXT_PUBLIC_DEFAULT_LNG,
        areaSlug: data.area,
        radiusM: data.radius_m,
      },
      filters: {
        distanceM: data.radius_m,
        minRating: data.min_rating,
        priceLevels: data.price,
        openNow: data.open_now,
        categorySlugs: data.category,
        attributes: data.attributes,
        services: data.services,
        hasOffers: data.has_offers,
        verifiedOnly: data.verified,
      },
      page: data.page,
      pageSize: data.page_size,
      sort: data.sort,
      sessionId: data.session_id,
    });

    return jsonOk(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "X-RateLimit-Remaining": String(limited.remaining),
        "X-RateLimit-Limit": String(limited.limit),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
