import type { ClaimStatus } from "@/domain/business/types";
import type { DayHours, SpecialHoursEntry } from "@/domain/onboarding/types";

export type DashboardMetrics = {
  profileViews: number;
  searchAppearances: number;
  clicks: number;
  calls: number;
  websiteVisits: number;
  directions: number;
  enquiries: number;
  saves: number;
  reviews: number;
  periodLabel: string;
};

export type DashboardInsight = {
  id: string;
  tone: "action" | "info" | "success";
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

export type CatalogItem = {
  id: string;
  kind: "product" | "service";
  name: string;
  description: string;
  priceCents: number | null;
  published: boolean;
  sortOrder: number;
  attributes: string[];
};

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  priceCents: number | null;
  published: boolean;
  sortOrder: number;
  dietary: string[];
};

export type MenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
};

export type DashboardPhoto = {
  id: string;
  role: "logo" | "cover" | "gallery";
  name: string;
  previewUrl: string | null;
  /** Object key in the business-photos bucket. Null until upload succeeds. */
  storagePath: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type DashboardOffer = {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  active: boolean;
};

export type DashboardReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  createdAt: string;
  status: "PUBLISHED" | "HIDDEN" | "FLAGGED";
};

export type DashboardLead = {
  id: string;
  type: "enquiry" | "call" | "directions" | "booking";
  name: string | null;
  message: string | null;
  createdAt: string;
  status: "NEW" | "READ" | "CLOSED";
};

export type TeamMember = {
  id: string;
  email: string;
  displayName: string;
  role: "OWNER" | "STAFF";
  permissions: string[];
  status: "active" | "invited";
  invitedAt: string;
};

export type DashboardProfile = {
  businessId: string;
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  phone: string;
  email: string;
  website: string;
  suburb: string;
  city: string;
  addressLine1: string;
  lat: number | null;
  lng: number | null;
  priceLevel: number | null;
  completeness: number;
  verificationStatus: ClaimStatus | "UNCLAIMED";
  status: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SUSPENDED";
  ownerEditPending: boolean;
};

export type DashboardWorkspace = {
  profile: DashboardProfile;
  metrics: DashboardMetrics;
  products: CatalogItem[];
  services: CatalogItem[];
  menu: MenuCategory[];
  photos: DashboardPhoto[];
  hours: DayHours[];
  specialHours: SpecialHoursEntry[];
  temporarilyClosed: boolean;
  offers: DashboardOffer[];
  reviews: DashboardReview[];
  leads: DashboardLead[];
  team: TeamMember[];
  updatedAt: string;
};
