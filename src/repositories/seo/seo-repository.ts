import "server-only";

import { cache } from "react";
import type { ConsumerBusinessCard } from "@/domain/consumer/types";
import type { SeoCatalogItem } from "@/domain/seo/types";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { createLogger } from "@/lib/logging/logger";
import { hasSupabaseConfig } from "@/config/env";
import { listPublishedBusinesses } from "@/repositories/consumer/business-repository";

const log = createLogger({ module: "seo-repository" });

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Load published businesses + real products/services for SEO hubs.
 * Never invents inventory when Supabase is unset.
 */
const listBusinessesForSeoSupply = cache(async function listBusinessesForSeoSupply(
  supplyKey: string,
): Promise<{
  businesses: ConsumerBusinessCard[];
  catalogItems: SeoCatalogItem[];
  source: "supabase" | "empty";
}> {
  const supplyCategorySlugs = supplyKey.split(",").filter(Boolean);
  if (!hasSupabaseConfig()) {
    return { businesses: [], catalogItems: [], source: "empty" };
  }

  const { items, source } = await listPublishedBusinesses(200, supplyKey);
  const supply = new Set(supplyCategorySlugs);
  const businesses = items.filter((b) => {
    const slugs = b.categorySlugs ?? [];
    if (slugs.some((s) => supply.has(s))) return true;
    if (supply.has("services")) {
      return slugs.some((s) => ["plumbers", "electricians", "services"].includes(s));
    }
    return false;
  });

  const supabase = createPublicSupabaseClient();
  if (!supabase || businesses.length === 0) {
    return { businesses, catalogItems: [], source };
  }

  const ids = businesses.map((b) => b.id);
  const catalogItems: SeoCatalogItem[] = [];

  const [{ data: products, error: pErr }, { data: services, error: sErr }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, business_id, businesses!inner ( slug )")
        .in("business_id", ids)
        .eq("is_available", true)
        .is("deleted_at", null)
        .limit(200),
      supabase
        .from("services")
        .select("id, name, business_id, businesses!inner ( slug )")
        .in("business_id", ids)
        .eq("is_available", true)
        .is("deleted_at", null)
        .limit(200),
    ]);

  if (pErr) log.error("seo_products_failed", { message: pErr.message });
  if (sErr) log.error("seo_services_failed", { message: sErr.message });

  for (const row of products ?? []) {
    const biz = row.businesses as unknown as { slug: string } | null;
    const name = row.name as string;
    catalogItems.push({
      name,
      slug: slugify(name),
      path: biz?.slug ? `/b/${biz.slug}` : "#",
      kind: "product",
    });
  }
  for (const row of services ?? []) {
    const biz = row.businesses as unknown as { slug: string } | null;
    const name = row.name as string;
    catalogItems.push({
      name,
      slug: slugify(name),
      path: biz?.slug ? `/b/${biz.slug}` : "#",
      kind: "service",
    });
  }

  // Menu items also count toward dish density
  const { data: menus, error: mErr } = await supabase
    .from("menus")
    .select(
      `
      business_id,
      is_active,
      businesses ( slug ),
      menu_categories (
        menu_items ( name, is_available )
      )
    `,
    )
    .in("business_id", ids)
    .eq("is_active", true)
    .limit(100);

  if (mErr) {
    log.error("seo_menu_items_failed", { message: mErr.message });
  } else {
    for (const menu of menus ?? []) {
      const biz = menu.businesses as unknown as { slug: string } | null;
      const cats = (menu.menu_categories ?? []) as unknown as {
        menu_items: { name: string; is_available: boolean }[];
      }[];
      for (const cat of cats) {
        for (const item of cat.menu_items ?? []) {
          if (!item.is_available) continue;
          catalogItems.push({
            name: item.name,
            slug: slugify(item.name),
            path: biz?.slug ? `/b/${biz.slug}` : "#",
            kind: "dish",
          });
        }
      }
    }
  }

  return { businesses, catalogItems, source };
});

export function listBusinessesForSeoHub(supplyCategorySlugs: string[]) {
  const supplyKey = [...new Set(supplyCategorySlugs)].sort().join(",");
  return listBusinessesForSeoSupply(supplyKey);
}

export async function listIndexableSeoPagesFromDb(): Promise<
  { path: string; canonicalPath: string; updatedAt: string | null }[]
> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("seo_pages")
    .select("path, canonical_path, updated_at, indexable")
    .eq("indexable", true)
    .order("path");

  if (error) {
    log.error("seo_pages_list_failed", { message: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    path: row.path as string,
    canonicalPath: (row.canonical_path as string) ?? (row.path as string),
    updatedAt: (row.updated_at as string | null) ?? null,
  }));
}

export async function listPublishedBusinessSlugsForSitemap(): Promise<
  { slug: string; updatedAt: string | null }[]
> {
  if (!hasSupabaseConfig()) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .eq("status", "PUBLISHED")
    .is("deleted_at", null)
    .order("slug")
    .limit(5000);

  if (error) {
    log.error("sitemap_businesses_failed", { message: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    updatedAt: (row.updated_at as string | null) ?? null,
  }));
}
