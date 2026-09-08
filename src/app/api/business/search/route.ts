import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { hasSupabaseConfig } from "@/config/env";
import { rateLimit } from "@/lib/security/rate-limit";
import { escapePostgrestOrValue, sanitizeSearchQuery } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anon";
    const limited = await rateLimit(`business-search:${ip}`, 40, 60_000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const q = sanitizeSearchQuery(request.nextUrl.searchParams.get("q")?.trim() ?? "");

    if (hasSupabaseConfig()) {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        let query = supabase
          .from("businesses")
          .select(
            `
            id, name, slug, is_claimed, phone, website,
            business_locations ( suburb, city, address_line1, geom ),
            business_categories ( categories ( name ) )
          `,
          )
          .eq("status", "PUBLISHED")
          .is("deleted_at", null)
          .limit(20);

        if (q) {
          const safe = escapePostgrestOrValue(q);
          query = query.or(`name.ilike.%${safe}%,website.ilike.%${safe}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
          const items = data.map((row) => {
            const locs = (row.business_locations ?? []) as unknown as {
              suburb: string | null;
              city: string | null;
              address_line1: string | null;
              geom?: { type?: string; coordinates?: [number, number] } | null;
            }[];
            const loc = locs[0];
            const coords = loc?.geom?.coordinates;
            const cats = (row.business_categories ?? []) as unknown as {
              categories: { name: string } | null;
            }[];
            return {
              id: row.id as string,
              name: row.name as string,
              slug: row.slug as string,
              phone: (row.phone as string | null) ?? null,
              website: (row.website as string | null) ?? null,
              addressLine1: loc?.address_line1 ?? null,
              suburb: loc?.suburb ?? null,
              city: loc?.city ?? null,
              lat: coords?.[1] ?? null,
              lng: coords?.[0] ?? null,
              categoryLabel: cats[0]?.categories?.name ?? null,
              isClaimed: Boolean(row.is_claimed),
            };
          });
          return jsonOk({ items, source: "supabase" });
        }
      }
    }

    return jsonOk({
      items: [],
      source: hasSupabaseConfig() ? "supabase" : "empty",
    });
  } catch (error) {
    return jsonError(error);
  }
}
