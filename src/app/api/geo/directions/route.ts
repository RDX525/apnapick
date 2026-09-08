import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { directionsUrl } from "@/services/geo/geo-service";

export const dynamic = "force-dynamic";

const schema = z.object({
  destLat: z.coerce.number().min(-90).max(90),
  destLng: z.coerce.number().min(-180).max(180),
  label: z.string().max(200).optional(),
  originLat: z.coerce.number().min(-90).max(90).optional(),
  originLng: z.coerce.number().min(-180).max(180).optional(),
});

/** Returns a directions URL — does not store precise coordinates. */
export async function GET(request: NextRequest) {
  try {
    const parsed = schema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid directions request",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const origin =
      parsed.data.originLat != null && parsed.data.originLng != null
        ? { lat: parsed.data.originLat, lng: parsed.data.originLng }
        : null;

    const url = directionsUrl({
      destination: {
        lat: parsed.data.destLat,
        lng: parsed.data.destLng,
      },
      destinationLabel: parsed.data.label,
      origin,
    });

    return jsonOk({ data: { url } });
  } catch (error) {
    return jsonError(error);
  }
}
