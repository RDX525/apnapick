import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { findNearbyBusinesses } from "@/services/geo/geo-service";
import { isFeatureEnabled } from "@/config/feature-flags";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().int().min(100).max(50000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const limited = await rateLimit(`geo:nearby:${ip}`, 60, 60_000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const parsed = schema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid location",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    // PostGIS proximity — works even when maps UI is disabled
    const businesses = await findNearbyBusinesses({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      radiusM: parsed.data.radius_m,
      limit: parsed.data.limit,
    });

    return jsonOk({
      data: {
        businesses,
        mapsEnabled: isFeatureEnabled("mapsEnabled"),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
