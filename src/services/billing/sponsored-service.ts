import "server-only";

import { isFeatureEnabled } from "@/config/feature-flags";
import { hasSupabaseConfig, hasServiceRoleKey } from "@/config/env";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { createAdminClient } from "@/lib/db/supabase-admin";
import type { SponsoredResult } from "@/domain/billing/types";
import type { ParsedSearchQuery } from "@/domain/search/types";

/**
 * Paid placement inventory — completely separate from organic RankingService.
 * Must be labeled in UI. Never mutates organic scores.
 */
export async function listSponsoredResults(input: {
  query: ParsedSearchQuery;
  areaSlug?: string | null;
  limit?: number;
}): Promise<SponsoredResult[]> {
  if (!isFeatureEnabled("paidPlacementEnabled")) return [];
  if (!hasSupabaseConfig()) return [];

  const supabase = hasServiceRoleKey()
    ? createAdminClient()
    : createPublicSupabaseClient();
  if (!supabase) return [];

  const now = new Date().toISOString();
  const { data: placements, error } = await supabase
    .from("sponsored_placements")
    .select("id, business_id, query_terms, area_slugs, category_slugs, label")
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(40);

  if (error || !placements?.length) return [];

  const qTerms = [
    ...input.query.itemTerms,
    ...input.query.freeTextTokens,
    input.query.normalized,
  ]
    .map((t) => t.toLowerCase())
    .filter(Boolean);

  const area = (
    input.query.location.areaSlug ??
    input.areaSlug ??
    ""
  ).toLowerCase();
  const cats = input.query.categorySlugs.map((c) => c.toLowerCase());

  const matched = placements.filter((p) => {
    const terms = ((p.query_terms as string[]) ?? []).map((t) => t.toLowerCase());
    const areas = ((p.area_slugs as string[]) ?? []).map((t) => t.toLowerCase());
    const categories = ((p.category_slugs as string[]) ?? []).map((t) => t.toLowerCase());

    const termOk =
      terms.length === 0 ||
      terms.some((t) => qTerms.some((q) => q.includes(t) || t.includes(q)));
    const areaOk = areas.length === 0 || (area ? areas.includes(area) : true);
    const catOk = categories.length === 0 || categories.some((c) => cats.includes(c));
    return termOk && areaOk && catOk;
  });

  const limit = Math.min(5, Math.max(1, input.limit ?? 3));
  const slice = matched.slice(0, limit);
  if (!slice.length) return [];

  const ids = slice.map((p) => p.business_id as string);
  const [{ data: businesses }, { data: locations }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, slug, avg_rating, review_count")
      .eq("status", "PUBLISHED")
      .is("deleted_at", null)
      .in("id", ids),
    supabase
      .from("business_locations")
      .select("business_id, suburb, is_primary")
      .in("business_id", ids),
  ]);

  const suburbByBusiness = new Map<string, string | null>();
  for (const loc of locations ?? []) {
    const bid = loc.business_id as string;
    if (loc.is_primary || !suburbByBusiness.has(bid)) {
      suburbByBusiness.set(bid, (loc.suburb as string | null) ?? null);
    }
  }

  const byId = new Map(
    (businesses ?? []).map((b) => [b.id as string, b as Record<string, unknown>]),
  );

  const out: SponsoredResult[] = [];
  for (const p of slice) {
    const b = byId.get(p.business_id as string);
    if (!b) continue;
    out.push({
      businessId: String(b.id),
      name: String(b.name),
      slug: String(b.slug),
      suburb: suburbByBusiness.get(String(b.id)) ?? null,
      avgRating: Number(b.avg_rating ?? 0),
      reviewCount: Number(b.review_count ?? 0),
      sponsored: true,
      label: String(p.label ?? "Sponsored"),
      placementId: String(p.id),
    });
  }
  return out;
}
