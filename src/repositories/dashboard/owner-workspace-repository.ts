import "server-only";

import type { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createLogger } from "@/lib/logging/logger";
import type { OwnerListingSnapshot } from "@/services/dashboard/owner-workspace";
import type { DashboardLead, MenuCategory, TeamMember } from "@/domain/dashboard/types";
import { resolvePhotoUrl } from "@/lib/media/photo-url";

const log = createLogger({ module: "owner-workspace-repository" });

type OwnerClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function monthStartIsoDate(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function leadType(value: unknown): DashboardLead["type"] {
  const raw = asString(value).toLowerCase();
  if (raw === "call") return "call";
  if (raw === "directions") return "directions";
  if (raw === "website") return "booking";
  return "enquiry";
}

function coordinatesFromGeom(geom: unknown): { lat: number | null; lng: number | null } {
  const record = asRecord(geom);
  const coords = record.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return { lat: null, lng: null };
}

function memberPermissions(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  const record = asRecord(value);
  return Object.entries(record)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
}

function mapMenu(rawMenus: unknown): MenuCategory[] {
  return asArray<Record<string, unknown>>(rawMenus).flatMap((menu) => {
    if (menu.is_active === false) return [];
    return asArray<Record<string, unknown>>(menu.menu_categories).map((category, index) => ({
      id: asString(category.id),
      name: asString(category.name, "Menu"),
      sortOrder: asNumber(category.sort_order, index),
      items: asArray<Record<string, unknown>>(category.menu_items).map((item, itemIndex) => ({
        id: asString(item.id),
        name: asString(item.name),
        description: asString(item.description),
        priceCents: item.price_cents == null ? null : asNumber(item.price_cents),
        published: item.is_available !== false,
        sortOrder: asNumber(item.sort_order, itemIndex),
        dietary: [],
      })),
    }));
  });
}

export async function fetchOwnerListingSnapshot(
  supabase: OwnerClient,
  userId: string,
): Promise<OwnerListingSnapshot | null> {
  const { data: memberships, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .limit(50);

  if (membershipError) {
    log.error("owner_memberships_failed", { message: membershipError.message });
    throw membershipError;
  }

  const businessIds = [...new Set((memberships ?? []).map((row) => String(row.business_id)))];
  if (businessIds.length === 0) return null;

  const startDate = monthStartIsoDate();
  const businessResult = await supabase
    .from("businesses")
    .select(
      `
      id, name, slug, description, status, phone, email, website, price_level,
      completeness, is_claimed, verified_at, metadata, updated_at, review_count,
      business_locations ( suburb, city, address_line1, is_primary, geom ),
      business_categories ( is_primary, categories ( slug ) ),
      business_hours ( day_of_week, opens_at, closes_at, is_closed ),
      special_hours ( on_date, opens_at, closes_at, is_closed, note ),
      products ( id, name, description, price_cents, is_available, sort_order, deleted_at ),
      services ( id, name, description, price_cents, is_available, sort_order, deleted_at ),
      photos ( id, storage_path, alt_text, sort_order, is_cover, deleted_at ),
      offers ( id, title, description, discount_label, is_active, deleted_at ),
      reviews ( id, rating, title, body, status, created_at, deleted_at, profiles!reviews_user_id_fkey ( display_name ) ),
      leads ( id, lead_type, name, message, created_at ),
      menus (
        id, name, sort_order, is_active,
        menu_categories (
          id, name, sort_order,
          menu_items ( id, name, description, price_cents, is_available, sort_order )
        )
      )
    `,
    )
    .in("id", businessIds)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (businessResult.error) {
    log.error("owner_business_failed", { message: businessResult.error.message });
    throw businessResult.error;
  }
  const row = asArray<Record<string, unknown>>(businessResult.data)[0];
  if (!row) return null;

  const businessId = asString(row.id);
  const [membersResult, metricsResult] = await Promise.all([
    supabase
      .from("business_members")
      .select(
        "id, business_id, user_id, role, permissions, accepted_at, created_at, profiles!business_members_user_id_fkey ( display_name )",
      )
      .eq("business_id", businessId),
    supabase
      .from("business_metrics_daily")
      .select(
        "business_id, views, search_impressions, clicks, calls, direction_intents, leads, favorites",
      )
      .eq("business_id", businessId)
      .gte("metric_date", startDate),
  ]);
  const locations = asArray<Record<string, unknown>>(row.business_locations);
  const primaryLocation =
    locations.find((location) => location.is_primary) ?? locations[0] ?? null;
  const categories = asArray<Record<string, unknown>>(row.business_categories);
  const primaryCategory =
    categories.find((category) => category.is_primary) ?? categories[0];
  const categorySlug = asString(asRecord(primaryCategory?.categories).slug);

  const emptyMetrics: OwnerListingSnapshot["metrics"] = {
    views: 0,
    searchImpressions: 0,
    clicks: 0,
    calls: 0,
    directions: 0,
    leads: 0,
    favorites: 0,
  };
  const metrics = asArray<Record<string, unknown>>(metricsResult.data).reduce<
    OwnerListingSnapshot["metrics"]
  >(
    (sum, metric) => ({
      views: sum.views + asNumber(metric.views),
      searchImpressions: sum.searchImpressions + asNumber(metric.search_impressions),
      clicks: sum.clicks + asNumber(metric.clicks),
      calls: sum.calls + asNumber(metric.calls),
      directions: sum.directions + asNumber(metric.direction_intents),
      leads: sum.leads + asNumber(metric.leads),
      favorites: sum.favorites + asNumber(metric.favorites),
    }),
    emptyMetrics,
  );

  const team: TeamMember[] = asArray<Record<string, unknown>>(membersResult.data).map(
    (member) => ({
      id: asString(member.id),
      email: "",
      displayName: asString(asRecord(member.profiles).display_name, "Team member"),
      role: asString(member.role) === "OWNER" ? "OWNER" : "STAFF",
      permissions: memberPermissions(member.permissions),
      status: member.accepted_at ? "active" : "invited",
      invitedAt: asString(member.created_at),
    }),
  );

  if (membersResult.error) {
    log.warn("owner_members_failed", { message: membersResult.error.message });
  }
  if (metricsResult.error) {
    log.warn("owner_metrics_failed", { message: metricsResult.error.message });
  }

  return {
    business: {
      id: businessId,
      name: asString(row.name),
      slug: asString(row.slug),
      description: asNullableString(row.description),
      status: asString(row.status, "DRAFT"),
      phone: asNullableString(row.phone),
      email: asNullableString(row.email),
      website: asNullableString(row.website),
      priceLevel: row.price_level == null ? null : asNumber(row.price_level),
      completeness: asNumber(row.completeness),
      isClaimed: Boolean(row.is_claimed),
      verifiedAt: asNullableString(row.verified_at),
      metadata: asRecord(row.metadata),
      updatedAt: asString(row.updated_at, new Date().toISOString()),
      reviewCount: asNumber(row.review_count),
    },
    location: primaryLocation
      ? {
          suburb: asNullableString(primaryLocation.suburb),
          city: asNullableString(primaryLocation.city),
          addressLine1: asNullableString(primaryLocation.address_line1),
          ...coordinatesFromGeom(primaryLocation.geom),
        }
      : null,
    categorySlug,
    hours: asArray<Record<string, unknown>>(row.business_hours).map((hour) => ({
      dayOfWeek: asNumber(hour.day_of_week),
      opensAt: asNullableString(hour.opens_at),
      closesAt: asNullableString(hour.closes_at),
      isClosed: Boolean(hour.is_closed),
    })),
    specialHours: asArray<Record<string, unknown>>(row.special_hours).map((hour) => ({
      date: asString(hour.on_date),
      label: asNullableString(hour.note),
      opensAt: asNullableString(hour.opens_at),
      closesAt: asNullableString(hour.closes_at),
      isClosed: Boolean(hour.is_closed),
    })),
    products: asArray<Record<string, unknown>>(row.products)
      .filter((item) => !item.deleted_at)
      .map((item, index) => ({
        id: asString(item.id),
        name: asString(item.name),
        description: asNullableString(item.description),
        priceCents: item.price_cents == null ? null : asNumber(item.price_cents),
        published: item.is_available !== false,
        sortOrder: asNumber(item.sort_order, index),
      })),
    services: asArray<Record<string, unknown>>(row.services)
      .filter((item) => !item.deleted_at)
      .map((item, index) => ({
        id: asString(item.id),
        name: asString(item.name),
        description: asNullableString(item.description),
        priceCents: item.price_cents == null ? null : asNumber(item.price_cents),
        published: item.is_available !== false,
        sortOrder: asNumber(item.sort_order, index),
      })),
    photos: asArray<Record<string, unknown>>(row.photos)
      .filter((photo) => !photo.deleted_at)
      .map((photo, index) => ({
        id: asString(photo.id),
        name: asString(photo.alt_text, asString(photo.storage_path, "Photo")),
        previewUrl: resolvePhotoUrl(asNullableString(photo.storage_path)),
        storagePath: asNullableString(photo.storage_path),
        sortOrder: asNumber(photo.sort_order, index),
        isCover: Boolean(photo.is_cover),
      })),
    menu: mapMenu(row.menus),
    offers: asArray<Record<string, unknown>>(row.offers)
      .filter((offer) => !offer.deleted_at)
      .map((offer) => ({
        id: asString(offer.id),
        title: asString(offer.title),
        description: asString(offer.description),
        discountLabel: asString(offer.discount_label),
        active: offer.is_active !== false,
      })),
    reviews: asArray<Record<string, unknown>>(row.reviews)
      .filter((review) => !review.deleted_at)
      .map((review) => ({
        id: asString(review.id),
        rating: asNumber(review.rating),
        title: asNullableString(review.title),
        body: asNullableString(review.body),
        authorName: asString(asRecord(review.profiles).display_name, "Customer"),
        createdAt: asString(review.created_at),
        status:
          asString(review.status) === "HIDDEN"
            ? "HIDDEN"
            : asString(review.status) === "FLAGGED"
              ? "FLAGGED"
              : "PUBLISHED",
      })),
    leads: asArray<Record<string, unknown>>(row.leads).map((lead) => ({
      id: asString(lead.id),
      type: leadType(lead.lead_type),
      name: asNullableString(lead.name),
      message: asNullableString(lead.message),
      createdAt: asString(lead.created_at),
      status: "NEW" as const,
    })),
    team,
    metrics,
  };
}
