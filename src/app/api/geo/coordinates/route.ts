import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { enrichWithCoordinates } from "@/services/geo/geo-service";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anon";
    const limited = await rateLimit(`geo-coordinates:${ip}`, 60, 60_000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }
    const raw = request.nextUrl.searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 50);

    const parsed = z.array(z.string().uuid()).safeParse(ids);
    if (!parsed.success || parsed.data.length === 0) {
      throw new AppError({
        message: "ids must be a comma-separated list of UUIDs",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const coordinates = await enrichWithCoordinates(parsed.data);
    return jsonOk(
      { data: { coordinates } },
      {
        headers: {
          "X-RateLimit-Remaining": String(limited.remaining),
          "X-RateLimit-Limit": String(limited.limit),
        },
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}
