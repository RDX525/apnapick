import "server-only";

import type { ParsedSearchQuery, SearchCandidate } from "@/domain/search/types";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { createLogger } from "@/lib/logging/logger";
import { pickCoverPhotoUrl } from "@/lib/media/photo-url";
import {
  pickMatchedCatalogItem,
  type PricedCatalogItem,
} from "@/services/search/catalog-match";

const log = createLogger({ module: "search-hydrate" });

type MenuRow = {
  business_id: string;
  menu_categories?: {
    menu_items?: {
      name: string;
      price_cents: number | null;
      is_available: boolean;
    }[];
  }[];
};

export async function hydrateSearchCandidates(
  candidates: SearchCandidate[],
  parsed: ParsedSearchQuery,
): Promise<SearchCandidate[]> {
  if (candidates.length === 0) return candidates;
  const supabase = createPublicSupabaseClient();
  if (!supabase) return candidates;

  const ids = [...new Set(candidates.map((c) => c.businessId))];
  const terms = [
    ...parsed.itemTerms,
    ...parsed.expandedTerms,
    ...parsed.serviceTerms,
  ];

  const [phonesRes, productsRes, servicesRes, menusRes, photosRes, categoriesRes] =
    await Promise.all([
    supabase.from("businesses").select("id, phone").in("id", ids),
    supabase
      .from("products")
      .select("business_id, name, price_cents, is_available, deleted_at")
      .in("business_id", ids),
    supabase
      .from("services")
      .select("business_id, name, price_cents, is_available, deleted_at")
      .in("business_id", ids),
    supabase
      .from("menus")
      .select(
        "business_id, menu_categories ( menu_items ( name, price_cents, is_available ) )",
      )
      .in("business_id", ids)
      .eq("is_active", true),
    supabase
      .from("photos")
      .select("business_id, storage_path, is_cover, sort_order, deleted_at")
      .in("business_id", ids)
      .is("deleted_at", null),
    supabase
      .from("business_categories")
      .select("business_id, is_primary, categories ( slug, name )")
      .in("business_id", ids),
  ]);

  if (phonesRes.error) log.error("hydrate_phones_failed", { message: phonesRes.error.message });
  if (productsRes.error) {
    log.error("hydrate_products_failed", { message: productsRes.error.message });
  }
  if (servicesRes.error) {
    log.error("hydrate_services_failed", { message: servicesRes.error.message });
  }
  if (menusRes.error) log.error("hydrate_menus_failed", { message: menusRes.error.message });
  if (photosRes.error) log.error("hydrate_photos_failed", { message: photosRes.error.message });
  if (categoriesRes.error) {
    log.error("hydrate_categories_failed", { message: categoriesRes.error.message });
  }

  const phoneById = new Map<string, string | null>();
  for (const row of phonesRes.data ?? []) {
    phoneById.set(row.id as string, (row.phone as string | null) ?? null);
  }

  const itemsById = new Map<string, PricedCatalogItem[]>();
  function addItem(businessId: string, item: PricedCatalogItem) {
    const list = itemsById.get(businessId) ?? [];
    list.push(item);
    itemsById.set(businessId, list);
  }

  for (const row of productsRes.data ?? []) {
    if (row.deleted_at || row.is_available === false) continue;
    addItem(row.business_id as string, {
      name: row.name as string,
      priceCents: (row.price_cents as number | null) ?? null,
    });
  }
  for (const row of servicesRes.data ?? []) {
    if (row.deleted_at || row.is_available === false) continue;
    addItem(row.business_id as string, {
      name: row.name as string,
      priceCents: (row.price_cents as number | null) ?? null,
    });
  }
  for (const menu of (menusRes.data ?? []) as MenuRow[]) {
    for (const category of menu.menu_categories ?? []) {
      for (const item of category.menu_items ?? []) {
        if (!item.is_available) continue;
        addItem(menu.business_id, {
          name: item.name,
          priceCents: item.price_cents,
        });
      }
    }
  }

  const imageById = new Map<string, string>();
  const photosById = new Map<
    string,
    Array<{
      storage_path: string | null;
      is_cover: boolean;
      sort_order: number;
      deleted_at: string | null;
    }>
  >();
  for (const row of photosRes.data ?? []) {
    const businessId = String(row.business_id);
    const list = photosById.get(businessId) ?? [];
    list.push({
      storage_path: (row.storage_path as string | null) ?? null,
      is_cover: Boolean(row.is_cover),
      sort_order: Number(row.sort_order ?? 0),
      deleted_at: (row.deleted_at as string | null) ?? null,
    });
    photosById.set(businessId, list);
  }
  for (const [businessId, photos] of photosById) {
    const url = pickCoverPhotoUrl(photos);
    if (url) imageById.set(businessId, url);
  }

  const categoriesById = new Map<string, string[]>();
  for (const row of categoriesRes.data ?? []) {
    const businessId = String(row.business_id);
    const related = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const slug =
      related && typeof related === "object"
        ? String((related as { slug?: unknown }).slug ?? "")
        : "";
    if (!slug) continue;
    const list = categoriesById.get(businessId) ?? [];
    if (row.is_primary) list.unshift(slug);
    else list.push(slug);
    categoriesById.set(businessId, list);
  }

  return candidates.map((candidate) => {
    const catalog = itemsById.get(candidate.businessId) ?? [];
    const matched = pickMatchedCatalogItem(catalog, terms, parsed.maxPriceCents);
    const fallbackName = matched?.name ?? candidate.matchedItemName ?? null;
    const fallbackPrice =
      matched?.priceCents ??
      catalog.find(
        (item) =>
          fallbackName &&
          item.name.toLowerCase() === fallbackName.toLowerCase(),
      )?.priceCents ??
      null;
    const categories = categoriesById.get(candidate.businessId);
    const uniqueCategories = categories
      ? [...new Set(categories)]
      : candidate.categories;

    return {
      ...candidate,
      phone: phoneById.get(candidate.businessId) ?? candidate.phone ?? null,
      matchedItemName: fallbackName,
      matchedItemPriceCents: fallbackPrice,
      imageUrl: imageById.get(candidate.businessId) ?? candidate.imageUrl ?? null,
      categories: uniqueCategories,
    };
  });
}
