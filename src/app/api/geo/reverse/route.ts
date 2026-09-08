import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { reverseGeocodeLocation } from "@/services/geo/geo-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const limited = await rateLimit(`geo:reverse:${ip}`, 30, 60_000);
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
        message: "Invalid coordinates",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const result = await reverseGeocodeLocation({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });

    return jsonOk({ data: { result } });
  } catch (error) {
    return jsonError(error);
  }
}
