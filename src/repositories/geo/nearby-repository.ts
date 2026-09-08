import "server-only";

import type { NearbyBusiness } from "@/domain/geo/types";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createLogger } from "@/lib/logging/logger";
import { hasSupabaseConfig } from "@/config/env";
import { haversineMeters } from "@/lib/geo/distance";

const log = createLogger({ module: "nearby-repository" });

export async function queryNearbyBusinesses(input: {
  lat: number;
  lng: number;
  radiusM?: number;
  limit?: number;
}): Promise<NearbyBusiness[]> {
  if (!hasSupabaseConfig()) return [];

  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("nearby_businesses", {
    p_lat: input.lat,
    p_lng: input.lng,
    p_radius_m: input.radiusM ?? 5000,
    p_limit: input.limit ?? 40,
  });

  if (error) {
    log.error("nearby_rpc_failed", { message: error.message });
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => {
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const distanceM =
      row.distance_m != null
        ? Number(row.distance_m)
        : Number.isFinite(lat) && Number.isFinite(lng)
          ? haversineMeters(input.lat, input.lng, lat, lng)
          : 0;

    return {
      businessId: String(row.business_id),
      name: String(row.name),
      slug: String(row.slug),
      avgRating: Number(row.avg_rating ?? 0),
      reviewCount: Number(row.review_count ?? 0),
      distanceM,
      suburb: (row.suburb as string | null) ?? null,
      city: (row.city as string | null) ?? null,
      lat: Number.isFinite(lat) ? lat : input.lat,
      lng: Number.isFinite(lng) ? lng : input.lng,
    };
  });
}

export async function queryBusinessCoordinates(
  businessIds: string[],
): Promise<Record<string, { lat: number; lng: number; suburb: string | null }>> {
  if (!hasSupabaseConfig() || businessIds.length === 0) return {};

  const supabase = await createServerSupabaseClient();
  if (!supabase) return {};

  const { data, error } = await supabase.rpc("business_coordinates", {
    p_ids: businessIds,
  });

  if (error) {
    // Fallback: select geom via raw query if RPC not migrated yet
    log.error("business_coordinates_failed", { message: error.message });
    const { data: locs, error: locErr } = await supabase
      .from("business_locations")
      .select("business_id, suburb, geom")
      .in("business_id", businessIds)
      .not("geom", "is", null)
      .limit(100);

    if (locErr || !locs) return {};
    // Without ST_Y in client we can't decode EWKB easily — return empty
    void locs;
    return {};
  }

  const out: Record<string, { lat: number; lng: number; suburb: string | null }> = {};
  for (const row of data ?? []) {
    const id = String((row as { business_id: string }).business_id);
    const lat = Number((row as { lat: number }).lat);
    const lng = Number((row as { lng: number }).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out[id] = {
      lat,
      lng,
      suburb: ((row as { suburb: string | null }).suburb as string | null) ?? null,
    };
  }
  return out;
}
