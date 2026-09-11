import type {
  CatalogItem,
  DashboardLead,
  DashboardPhoto,
  DashboardProfile,
  DashboardWorkspace,
  MenuCategory,
  TeamMember,
} from "@/domain/dashboard/types";
import { emptyDayHours } from "@/domain/onboarding/types";
import {
  createEmptyWorkspace,
  scoreWorkspaceCompleteness,
} from "@/services/dashboard/workspace";

export type OwnerListingSnapshot = {
  business: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    priceLevel: number | null;
    completeness: number;
    isClaimed: boolean;
    verifiedAt: string | null;
    metadata: Record<string, unknown> | null;
    updatedAt: string;
    reviewCount: number;
  };
  location: {
    suburb: string | null;
    city: string | null;
    addressLine1: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  categorySlug: string;
  hours: Array<{
    dayOfWeek: number;
    opensAt: string | null;
    closesAt: string | null;
    isClosed: boolean;
  }>;
  specialHours: Array<{
    date: string;
    label: string | null;
    opensAt: string | null;
    closesAt: string | null;
    isClosed: boolean;
  }>;
  products: Array<{
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
    published: boolean;
    sortOrder: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
    published: boolean;
    sortOrder: number;
  }>;
  photos: Array<{
    id: string;
    name: string;
    previewUrl: string | null;
    storagePath: string | null;
    sortOrder: number;
    isCover: boolean;
  }>;
  menu: MenuCategory[];
  offers: DashboardWorkspace["offers"];
  reviews: DashboardWorkspace["reviews"];
  leads: DashboardLead[];
  team: TeamMember[];
  metrics: {
    views: number;
    searchImpressions: number;
    clicks: number;
    calls: number;
    directions: number;
    leads: number;
    favorites: number;
  };
};

const DASHBOARD_STATUSES = new Set<DashboardProfile["status"]>([
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "SUSPENDED",
]);

export function dashboardStatusFromBusiness(
  status: string,
): DashboardProfile["status"] {
  if (DASHBOARD_STATUSES.has(status as DashboardProfile["status"])) {
    return status as DashboardProfile["status"];
  }
  if (status === "MERGED") return "REJECTED";
  return "DRAFT";
}

export function verificationStatusFromListing(input: {
  isClaimed: boolean;
  verifiedAt: string | null;
}): DashboardProfile["verificationStatus"] {
  if (input.verifiedAt || input.isClaimed) return "VERIFIED";
  return "UNCLAIMED";
}

function clock(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 5);
}

function toCatalogItem(
  item: OwnerListingSnapshot["products"][number],
  kind: CatalogItem["kind"],
): CatalogItem {
  return {
    id: item.id,
    kind,
    name: item.name,
    description: item.description ?? "",
    priceCents: item.priceCents,
    published: item.published,
    sortOrder: item.sortOrder,
    attributes: [],
  };
}

function toPhoto(photo: OwnerListingSnapshot["photos"][number]): DashboardPhoto {
  return {
    id: photo.id,
    role: photo.isCover ? "cover" : "gallery",
    name: photo.name,
    previewUrl: photo.previewUrl,
    storagePath: photo.storagePath,
    sortOrder: photo.sortOrder,
    isCover: photo.isCover,
  };
}

/** Map a persisted owner listing into the dashboard workspace. */
export function workspaceFromOwnerListing(
  snapshot: OwnerListingSnapshot,
): DashboardWorkspace {
  const hours = emptyDayHours().map((day) => {
    const match = snapshot.hours.find((row) => row.dayOfWeek === day.dayOfWeek);
    if (!match) return day;
    return {
      ...day,
      isClosed: match.isClosed,
      opensAt: clock(match.opensAt),
      closesAt: clock(match.closesAt),
    };
  });

  const workspace: DashboardWorkspace = {
    ...createEmptyWorkspace(),
    profile: {
      businessId: snapshot.business.id,
      name: snapshot.business.name,
      slug: snapshot.business.slug,
      description: snapshot.business.description ?? "",
      categorySlug: snapshot.categorySlug,
      phone: snapshot.business.phone ?? "",
      email: snapshot.business.email ?? "",
      website: snapshot.business.website ?? "",
      suburb: snapshot.location?.suburb ?? "",
      city: snapshot.location?.city ?? "Pune",
      addressLine1: snapshot.location?.addressLine1 ?? "",
      lat: snapshot.location?.lat ?? null,
      lng: snapshot.location?.lng ?? null,
      priceLevel: snapshot.business.priceLevel,
      completeness: snapshot.business.completeness,
      verificationStatus: verificationStatusFromListing({
        isClaimed: snapshot.business.isClaimed,
        verifiedAt: snapshot.business.verifiedAt,
      }),
      status: dashboardStatusFromBusiness(snapshot.business.status),
      ownerEditPending: snapshot.business.metadata?.ownerEditPending === true,
    },
    metrics: {
      profileViews: snapshot.metrics.views,
      searchAppearances: snapshot.metrics.searchImpressions,
      clicks: snapshot.metrics.clicks,
      calls: snapshot.metrics.calls,
      websiteVisits: 0,
      directions: snapshot.metrics.directions,
      enquiries: snapshot.metrics.leads,
      saves: snapshot.metrics.favorites,
      reviews: snapshot.business.reviewCount,
      periodLabel: "This month",
    },
    products: snapshot.products.map((item) => toCatalogItem(item, "product")),
    services: snapshot.services.map((item) => toCatalogItem(item, "service")),
    menu: snapshot.menu,
    photos: snapshot.photos.map(toPhoto),
    hours,
    specialHours: snapshot.specialHours.map((row) => ({
      date: row.date,
      label: row.label ?? undefined,
      isClosed: row.isClosed,
      opensAt: clock(row.opensAt),
      closesAt: clock(row.closesAt),
    })),
    temporarilyClosed: Boolean(snapshot.business.metadata?.temporarilyClosed),
    offers: snapshot.offers,
    reviews: snapshot.reviews,
    leads: snapshot.leads,
    team: snapshot.team,
    updatedAt: snapshot.business.updatedAt,
  };

  const scored = scoreWorkspaceCompleteness(workspace);
  workspace.profile.completeness = snapshot.business.completeness || scored;
  return workspace;
}
