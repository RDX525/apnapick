import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { geocodeLocation } from "@/services/geo/geo-service";
import { getPublicEnv } from "@/config/env";

export const dynamic = "force-dynamic";

const schema = z.object({
  q: z.string().trim().min(1).max(200),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  exact: z
    .enum(["1", "true", "0", "false"])
    .optional()
    .transform((value) => value === "1" || value === "true"),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const limited = await rateLimit(`geo:geocode:${ip}`, 30, 60_000);
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
        message: "Invalid query",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const env = getPublicEnv();
    const bias =
      parsed.data.lat != null && parsed.data.lng != null
        ? { lat: parsed.data.lat, lng: parsed.data.lng }
        : {
            lat: env.NEXT_PUBLIC_DEFAULT_LAT,
            lng: env.NEXT_PUBLIC_DEFAULT_LNG,
          };

    const results = await geocodeLocation(parsed.data.q, bias, {
      exact: parsed.data.exact,
    });
    return jsonOk({ data: { results } });
  } catch (error) {
    return jsonError(error);
  }
}
