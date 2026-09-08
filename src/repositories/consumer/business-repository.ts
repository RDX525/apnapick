import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type {
  ConsumerBusinessCard,
  ConsumerBusinessProfile,
} from "@/domain/consumer/types";
import { PUBLIC_DATA_REVALIDATE_SECONDS } from "@/lib/cache/public-data";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { createLogger } from "@/lib/logging/logger";
import { resolvePhotoUrl } from "@/lib/media/photo-url";
import { hasSupabaseConfig } from "@/config/env";

const log = createLogger({ module: "business-repository" });

async function queryPublishedBusinesses(
  limit: number,
  categoryKey: string,
): Promise<{
  items: ConsumerBusinessCard[];
  source: "supabase" | "empty";
}> {
  if (!hasSupabaseConfig()) {
    return { items: [], source: "empty" };
  }

  const supabase = createPublicSupabaseClient();
  if (!supabase) return { items: [], source: "empty" };

  const categorySlugs = categoryKey.split(",").filter(Boolean);
  let scopedIds: string[] | null = null;
  if (categorySlugs.length > 0) {
    const { data: categories, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .in("slug", categorySlugs);
    if (categoryError) {
      log.error("list_published_categories_failed", { message: categoryError.message });
      return { items: [], source: "empty" };
    }
    const categoryIds = (categories ?? []).map((row) => row.id as string);
    if (categoryIds.length === 0) return { items: [], source: "supabase" };
    const { data: memberships, error: membershipError } = await supabase
      .from("business_categories")
      .select("business_id")
      .in("category_id", categoryIds);
    if (membershipError) {
      log.error("list_published_memberships_failed", {
        message: membershipError.message,
      });
      return { items: [], source: "empty" };
    }
    scopedIds = [
      ...new Set((memberships ?? []).map((row) => row.business_id as string)),
    ];
    if (scopedIds.length === 0) return { items: [], source: "supabase" };
  }

  let query = supabase
    .from("businesses")
    .select(
      `
      id, name, slug, description, avg_rating, review_count, price_level,
      is_claimed, verified_at, completeness,
      business_locations ( suburb, city, geom ),
      business_categories ( categories ( name, slug ) ),
      photos ( storage_path, is_cover, deleted_at )
    `,
    )
    .eq("status", "PUBLISHED")
    .is("deleted_at", null)
    .order("avg_rating", { ascending: false })
    .order("name", { ascending: true })
    .limit(limit);

  if (scopedIds) query = query.in("id", scopedIds);

  const { data, error } = await query;

  if (error) {
    log.error("list_published_failed", { message: error.message });
    return { items: [], source: "empty" };
  }

  const items: ConsumerBusinessCard[] = (data ?? []).map((row) => {
    const locations = (row.business_locations ?? []) as unknown as {
      suburb: string | null;
      city: string | null;
    }[];
    const loc = locations[0];
    const cats = (row.business_categories ?? []) as unknown as {
      categories: { name: string; slug: string } | null;
    }[];
    const photos = (row.photos ?? []) as unknown as {
      storage_path: string;
      is_cover: boolean;
      deleted_at: string | null;
    }[];
    const livePhotos = photos.filter((p) => !p.deleted_at);
    const orderedPhotos = [
      ...livePhotos.filter((p) => p.is_cover),
      ...livePhotos.filter((p) => !p.is_cover),
    ];
    const coverImageUrl =
      orderedPhotos
        .map((p) => resolvePhotoUrl(p.storage_path))
        .find((url): url is string => Boolean(url)) ?? null;

    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string | null) ?? null,
      avgRating: Number(row.avg_rating ?? 0),
      reviewCount: Number(row.review_count ?? 0),
      priceLevel: (row.price_level as number | null) ?? null,
      isClaimed: Boolean(row.is_claimed),
      isVerified: Boolean(row.verified_at),
      openNow: null,
      suburb: loc?.suburb ?? null,
      city: loc?.city ?? null,
      distanceM: null,
      categoryLabel: cats[0]?.categories?.name ?? null,
      categorySlugs: cats
        .map((c) => c.categories?.slug)
        .filter((s): s is string => Boolean(s)),
      matchedItem: null,
      coverImageUrl,
      lat: null,
      lng: null,
    };
  });

  return { items, source: "supabase" };
}

const loadCachedPublishedBusinesses = unstable_cache(
  queryPublishedBusinesses,
  ["published-businesses"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: ["published-businesses"] },
);

export const listPublishedBusinesses = cache(async function listPublishedBusinesses(
  limit = 8,
  categoryKey = "",
) {
  return loadCachedPublishedBusinesses(limit, categoryKey);
});

async function queryBusinessBySlug(slug: string): Promise<ConsumerBusinessProfile | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select(
      `
      id, name, slug, description, avg_rating, review_count, price_level,
      is_claimed, verified_at, completeness, phone, website, email,
      business_locations ( address_line1, suburb, city, postcode, geom, is_primary ),
      business_categories ( categories ( name, slug ) ),
      photos ( id, storage_path, alt_text, is_cover, sort_order, deleted_at ),
      products ( id, name, description, price_cents, deleted_at, is_available ),
      services ( id, name, description, price_cents, deleted_at, is_available ),
      offers ( id, title, description, discount_label, is_active, deleted_at ),
      business_hours ( day_of_week, opens_at, closes_at, is_closed ),
      business_attributes ( value, attributes ( key, label ) ),
      reviews ( id, rating, title, body, created_at, status, deleted_at, user_id, reply_body, replied_at, profiles!reviews_user_id_fkey ( display_name ) ),
      menus (
        id, name, is_active,
        menu_categories (
          id, name, sort_order,
          menu_items ( id, name, description, price_cents, is_available )
        )
      )
    `,
    )
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    log.error("get_by_slug_failed", { message: error.message, slug });
    return null;
  }
  if (!data) return null;

  const locations = (data.business_locations ?? []) as unknown as {
    address_line1: string;
    suburb: string | null;
    city: string | null;
    postcode: string | null;
    is_primary: boolean;
  }[];
  const loc = locations.find((l) => l.is_primary) ?? locations[0] ?? null;

  const cats = (data.business_categories ?? []) as unknown as {
    categories: { name: string; slug: string } | null;
  }[];

  const photos = (
    (data.photos ?? []) as unknown as {
      id: string;
      storage_path: string;
      alt_text: string | null;
      is_cover: boolean;
      sort_order: number;
      deleted_at: string | null;
    }[]
  )
    .filter((p) => !p.deleted_at)
    .sort(
      (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
    );

  const products = (
    (data.products ?? []) as unknown as {
      id: string;
      name: string;
      description: string | null;
      price_cents: number | null;
      deleted_at: string | null;
      is_available: boolean;
    }[]
  )
    .filter((p) => !p.deleted_at && p.is_available)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceCents: p.price_cents,
    }));

  const services = (
    (data.services ?? []) as unknown as {
      id: string;
      name: string;
      description: string | null;
      price_cents: number | null;
      deleted_at: string | null;
      is_available: boolean;
    }[]
  )
    .filter((s) => !s.deleted_at && s.is_available)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      priceCents: s.price_cents,
    }));

  const offers = (
    (data.offers ?? []) as unknown as {
      id: string;
      title: string;
      description: string | null;
      discount_label: string | null;
      is_active: boolean;
      deleted_at: string | null;
    }[]
  )
    .filter((o) => o.is_active && !o.deleted_at)
    .map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      discountLabel: o.discount_label,
    }));

  const hours = (
    (data.business_hours ?? []) as unknown as {
      day_of_week: number;
      opens_at: string | null;
      closes_at: string | null;
      is_closed: boolean;
    }[]
  ).map((h) => ({
    dayOfWeek: h.day_of_week,
    opensAt: h.opens_at,
    closesAt: h.closes_at,
    isClosed: h.is_closed,
  }));

  const amenities = (
    (data.business_attributes ?? []) as unknown as {
      value: string;
      attributes: { key: string; label: string } | null;
    }[]
  )
    .filter((a) => a.attributes)
    .map((a) => ({
      key: a.attributes!.key,
      label: a.attributes!.label,
      value: a.value,
    }));

  const reviews = (
    (data.reviews ?? []) as unknown as {
      id: string;
      rating: number;
      title: string | null;
      body: string | null;
      created_at: string;
      status: string;
      deleted_at: string | null;
      user_id: string;
      reply_body: string | null;
      replied_at: string | null;
      profiles: { display_name: string | null } | null;
    }[]
  )
    .filter((r) => !r.deleted_at && r.status === "PUBLISHED")
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.created_at,
      authorName: r.profiles?.display_name ?? null,
      replyBody: r.reply_body,
      repliedAt: r.replied_at,
      userId: r.user_id,
    }));

  const menus = (
    (data.menus ?? []) as unknown as {
      id: string;
      name: string;
      is_active: boolean;
      menu_categories: {
        id: string;
        name: string;
        sort_order: number;
        menu_items: {
          id: string;
          name: string;
          description: string | null;
          price_cents: number | null;
          is_available: boolean;
        }[];
      }[];
    }[]
  )
    .filter((m) => m.is_active)
    .map((m) => ({
      id: m.id,
      name: m.name,
      categories: (m.menu_categories ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => ({
          id: c.id,
          name: c.name,
          items: (c.menu_items ?? [])
            .filter((i) => i.is_available)
            .map((i) => ({
              id: i.id,
              name: i.name,
              description: i.description,
              priceCents: i.price_cents,
            })),
        })),
    }));

  const resolvedPhotos = photos.flatMap((p) => {
    const url = resolvePhotoUrl(p.storage_path);
    return url ? [{ id: p.id, url, alt: p.alt_text }] : [];
  });

  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    description: (data.description as string | null) ?? null,
    about: (data.description as string | null) ?? null,
    avgRating: Number(data.avg_rating ?? 0),
    reviewCount: Number(data.review_count ?? 0),
    priceLevel: (data.price_level as number | null) ?? null,
    isClaimed: Boolean(data.is_claimed),
    isVerified: Boolean(data.verified_at),
    openNow: null,
    suburb: loc?.suburb ?? null,
    city: loc?.city ?? null,
    distanceM: null,
    categoryLabel: cats[0]?.categories?.name ?? null,
    categorySlugs: cats
      .map((c) => c.categories?.slug)
      .filter((s): s is string => Boolean(s)),
    matchedItem: null,
    coverImageUrl: resolvedPhotos[0]?.url ?? null,
    lat: null,
    lng: null,
    phone: (data.phone as string | null) ?? null,
    website: (data.website as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    addressLine1: loc?.address_line1 ?? null,
    postcode: loc?.postcode ?? null,
    completeness: Number(data.completeness ?? 0),
    photos: resolvedPhotos,
    products,
    services,
    menu: menus,
    offers,
    amenities,
    hours,
    reviews,
  };
}

const loadCachedBusinessBySlug = unstable_cache(
  queryBusinessBySlug,
  ["business-by-slug"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: ["published-businesses"] },
);

export const getBusinessBySlug = cache(async function getBusinessBySlug(slug: string) {
  return loadCachedBusinessBySlug(slug);
});

export async function listBusinessesByCategoryArea(
  categorySlug: string,
  areaSlug?: string,
): Promise<ConsumerBusinessCard[]> {
  const { items } = await listPublishedBusinesses(50);
  return items.filter((b) => {
    const catOk =
      !categorySlug ||
      (b.categorySlugs?.includes(categorySlug) ?? false) ||
      b.categoryLabel?.toLowerCase().replace(/\s+/g, "") ===
        categorySlug.replace(/-/g, "");
    const areaOk =
      !areaSlug ||
      areaSlug === "pune" ||
      b.suburb?.toLowerCase().replace(/\s+/g, "-") === areaSlug ||
      b.city?.toLowerCase() === areaSlug;
    return catOk && areaOk;
  });
}
