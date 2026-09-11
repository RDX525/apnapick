import type { DashboardWorkspace } from "@/domain/dashboard/types";
import { emptyDayHours } from "@/domain/onboarding/types";
import { completenessScore } from "@/services/onboarding/completeness";
import type { OnboardingDraftPayload } from "@/domain/onboarding/types";

export const DASHBOARD_STORAGE_KEY = "apnapick.dashboard.workspace.v1";

/** Empty owner workspace — production data comes from the signed-in listing. */
export function createEmptyWorkspace(): DashboardWorkspace {
  const hours = emptyDayHours();
  const workspace: DashboardWorkspace = {
    profile: {
      businessId: "",
      name: "",
      slug: "",
      description: "",
      categorySlug: "",
      phone: "",
      email: "",
      website: "",
      suburb: "",
      city: "Pune",
      addressLine1: "",
      lat: null,
      lng: null,
      priceLevel: null,
      completeness: 0,
      verificationStatus: "UNCLAIMED",
      status: "DRAFT",
      ownerEditPending: false,
    },
    metrics: {
      profileViews: 0,
      searchAppearances: 0,
      clicks: 0,
      calls: 0,
      websiteVisits: 0,
      directions: 0,
      enquiries: 0,
      saves: 0,
      reviews: 0,
      periodLabel: "This month",
    },
    products: [],
    services: [],
    menu: [],
    photos: [],
    hours,
    specialHours: [],
    temporarilyClosed: false,
    offers: [],
    reviews: [],
    leads: [],
    team: [],
    updatedAt: new Date().toISOString(),
  };
  workspace.profile.completeness = scoreWorkspaceCompleteness(workspace);
  return workspace;
}

/** Fixture workspace for unit tests only — never shown in the product UI. */
export function createSeedWorkspace(): DashboardWorkspace {
  let seedSequence = 0;
  const seedId = () => `seed-${++seedSequence}`;
  const seedNow = Date.parse("2026-09-01T12:00:00.000Z");
  const seedDate = (offsetMs = 0) => new Date(seedNow - offsetMs).toISOString();

  const hours = emptyDayHours().map((h) =>
    h.dayOfWeek === 0
      ? h
      : {
          ...h,
          isClosed: false,
          opensAt: "10:00",
          closesAt: "22:00",
        },
  );

  const workspace: DashboardWorkspace = {
    profile: {
      businessId: "11111111-1111-1111-1111-111111111101",
      name: "Spice Route Kitchen",
      slug: "spice-route-kitchen",
      description:
        "North Indian classics and rich gravies in Koregaon Park. Known for chicken curry and butter chicken.",
      categorySlug: "restaurants",
      phone: "+91 98765 43210",
      email: "hello@spiceroute.example",
      website: "https://example.com",
      suburb: "Koregaon Park",
      city: "Pune",
      addressLine1: "Lane 5, North Main Road",
      lat: 18.5362,
      lng: 73.8938,
      priceLevel: 2,
      completeness: 72,
      verificationStatus: "UNDER_REVIEW",
      status: "PENDING_REVIEW",
      ownerEditPending: false,
    },
    metrics: {
      profileViews: 486,
      searchAppearances: 124,
      clicks: 89,
      calls: 17,
      websiteVisits: 42,
      directions: 31,
      enquiries: 9,
      saves: 23,
      reviews: 12,
      periodLabel: "This month",
    },
    products: [
      {
        id: seedId(),
        kind: "product",
        name: "Chicken curry",
        description: "Traditional gravy with aromatic spices",
        priceCents: 28000,
        published: true,
        sortOrder: 0,
        attributes: ["spicy", "non-veg"],
      },
      {
        id: seedId(),
        kind: "product",
        name: "Butter chicken",
        description: "Creamy tomato makhani",
        priceCents: 32000,
        published: true,
        sortOrder: 1,
        attributes: ["non-veg"],
      },
    ],
    services: [],
    menu: [
      {
        id: seedId(),
        name: "Chicken",
        sortOrder: 0,
        items: [
          {
            id: seedId(),
            name: "Chicken Curry",
            description: "Traditional Punjabi-style curry",
            priceCents: 28000,
            published: true,
            sortOrder: 0,
            dietary: ["spicy", "indian"],
          },
        ],
      },
    ],
    photos: [
      {
        id: seedId(),
        role: "cover",
        name: "dining-room.jpg",
        previewUrl: null,
        storagePath: null,
        sortOrder: 0,
        isCover: true,
      },
      {
        id: seedId(),
        role: "gallery",
        name: "curry-bowl.jpg",
        previewUrl: null,
        storagePath: null,
        sortOrder: 1,
        isCover: false,
      },
    ],
    hours,
    specialHours: [],
    temporarilyClosed: false,
    offers: [
      {
        id: seedId(),
        title: "Weekday lunch thali",
        description: "Set lunch before 3pm",
        discountLabel: "15% off",
        active: true,
      },
    ],
    reviews: [
      {
        id: seedId(),
        rating: 5,
        title: "Best curry nearby",
        body: "Chicken curry was excellent and service was quick.",
        authorName: "Ananya",
        createdAt: seedDate(86400000 * 3),
        status: "PUBLISHED",
      },
      {
        id: seedId(),
        rating: 4,
        title: null,
        body: "Great flavours, a bit busy on weekends.",
        authorName: "Rahul",
        createdAt: seedDate(86400000 * 8),
        status: "PUBLISHED",
      },
    ],
    leads: [
      {
        id: seedId(),
        type: "enquiry",
        name: "Priya",
        message: "Do you take table bookings for Saturday?",
        createdAt: seedDate(3600000 * 5),
        status: "NEW",
      },
      {
        id: seedId(),
        type: "directions",
        name: null,
        message: "Directions opened from search results",
        createdAt: seedDate(86400000),
        status: "READ",
      },
    ],
    team: [
      {
        id: seedId(),
        email: "owner@spiceroute.example",
        displayName: "You (Owner)",
        role: "OWNER",
        permissions: ["manage_all"],
        status: "active",
        invitedAt: seedDate(),
      },
    ],
    updatedAt: seedDate(),
  };

  workspace.profile.completeness = scoreWorkspaceCompleteness(workspace);
  return workspace;
}

export function scoreWorkspaceCompleteness(workspace: DashboardWorkspace): number {
  const draft: OnboardingDraftPayload = {
    mode: "create",
    name: workspace.profile.name,
    description: workspace.profile.description,
    categorySlug: workspace.profile.categorySlug,
    subcategorySlug: "",
    phone: workspace.profile.phone,
    email: workspace.profile.email,
    website: workspace.profile.website,
    priceLevel: workspace.profile.priceLevel,
    attributes: [],
    tags: [],
    country: "India",
    state: "Maharashtra",
    city: workspace.profile.city,
    suburb: workspace.profile.suburb,
    postcode: "",
    addressLine1: workspace.profile.addressLine1,
    lat: workspace.profile.lat,
    lng: workspace.profile.lng,
    catalogItems: [
      ...workspace.products.map((p) => ({
        id: p.id,
        kind: "product" as const,
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        available: p.published,
        attributes: p.attributes,
      })),
      ...workspace.services.map((s) => ({
        id: s.id,
        kind: "service" as const,
        name: s.name,
        description: s.description,
        priceCents: s.priceCents,
        available: s.published,
        attributes: s.attributes,
      })),
    ],
    menuCategories: workspace.menu.map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items.map((i) => ({
        id: i.id,
        kind: "dish" as const,
        name: i.name,
        description: i.description,
        priceCents: i.priceCents,
        available: i.published,
        attributes: i.dietary,
      })),
    })),
    hours: workspace.hours,
    specialHours: workspace.specialHours,
    temporarilyClosed: workspace.temporarilyClosed,
    photos: workspace.photos.map((p) => ({
      id: p.id,
      role: p.role === "logo" ? "logo" : p.isCover ? "cover" : "gallery",
      name: p.name,
      sizeBytes: 1,
      mimeType: "image/jpeg",
      previewUrl: p.previewUrl,
      storagePath: p.storagePath,
    })),
    bookingUrl: "",
    orderUrl: "",
    social: {},
    verificationStatus: workspace.profile.verificationStatus,
    claimStatus:
      workspace.profile.verificationStatus === "UNCLAIMED"
        ? null
        : workspace.profile.verificationStatus,
  };
  return completenessScore(draft);
}

export function loadWorkspaceFromStorage(): DashboardWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DashboardWorkspace;
  } catch {
    return null;
  }
}

export function saveWorkspaceToStorage(workspace: DashboardWorkspace) {
  if (typeof window === "undefined") return;
  const next = {
    ...workspace,
    profile: {
      ...workspace.profile,
      completeness: scoreWorkspaceCompleteness(workspace),
    },
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(next));
  return next;
}
