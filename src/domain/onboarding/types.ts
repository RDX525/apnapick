import type { ClaimStatus } from "@/domain/business/types";

export const ONBOARDING_STEPS = [
  { id: "find", label: "Find business" },
  { id: "basics", label: "Business info" },
  { id: "location", label: "Location" },
  { id: "catalog", label: "Products & services" },
  { id: "hours", label: "Opening hours" },
  { id: "photos", label: "Photos" },
  { id: "contact", label: "Contact" },
  { id: "preview", label: "Preview" },
  { id: "submit", label: "Submit" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export type DayHours = {
  dayOfWeek: number; // 0=Sun
  isClosed: boolean;
  opensAt: string | null; // HH:MM
  closesAt: string | null;
  /** Optional second window (split hours). */
  opensAt2?: string | null;
  closesAt2?: string | null;
};

export type SpecialHoursEntry = {
  date: string; // YYYY-MM-DD
  label?: string;
  isClosed: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
};

export type CatalogItemDraft = {
  id: string;
  kind: "product" | "dish" | "service";
  name: string;
  description: string;
  priceCents: number | null;
  available: boolean;
  attributes: string[];
  photoDataUrl?: string | null;
};

export type MenuCategoryDraft = {
  id: string;
  name: string;
  items: CatalogItemDraft[];
};

export type PhotoDraft = {
  id: string;
  role: "logo" | "cover" | "gallery" | "product";
  name: string;
  sizeBytes: number;
  mimeType: string;
  /** Local preview only until uploaded to storage. */
  previewUrl?: string | null;
  storagePath?: string | null;
  progress?: number;
};

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
};

export type OnboardingDraftPayload = {
  mode: "claim" | "create";
  claimBusinessId?: string | null;
  claimBusinessName?: string | null;
  claimId?: string | null;
  claimStatus?: ClaimStatus | null;

  name: string;
  description: string;
  categorySlug: string;
  subcategorySlug: string;
  phone: string;
  email: string;
  website: string;
  priceLevel: number | null;
  attributes: string[];
  tags: string[];

  country: string;
  state: string;
  city: string;
  suburb: string;
  postcode: string;
  addressLine1: string;
  lat: number | null;
  lng: number | null;

  catalogItems: CatalogItemDraft[];
  menuCategories: MenuCategoryDraft[];

  hours: DayHours[];
  specialHours: SpecialHoursEntry[];
  temporarilyClosed: boolean;

  photos: PhotoDraft[];

  bookingUrl: string;
  orderUrl: string;
  social: SocialLinks;

  submittedAt?: string | null;
  submittedBusinessId?: string | null;
  verificationStatus?: ClaimStatus | "UNCLAIMED" | null;
};

export type CompletenessBreakdown = {
  score: number;
  missing: string[];
  groups: { id: string; label: string; weight: number; earned: number; ok: boolean }[];
};

export type DuplicateCandidate = {
  businessId: string;
  name: string;
  slug: string;
  phone?: string | null;
  suburb?: string | null;
  city?: string | null;
  website?: string | null;
  distanceM?: number | null;
  score: number;
  reasons: string[];
};

export function emptyDayHours(): DayHours[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    isClosed: true,
    opensAt: null,
    closesAt: null,
  }));
}

export function createEmptyDraft(): OnboardingDraftPayload {
  return {
    mode: "create",
    claimBusinessId: null,
    claimBusinessName: null,
    claimId: null,
    claimStatus: null,
    name: "",
    description: "",
    categorySlug: "",
    subcategorySlug: "",
    phone: "",
    email: "",
    website: "",
    priceLevel: 2,
    attributes: [],
    tags: [],
    country: "India",
    state: "Maharashtra",
    city: "Pune",
    suburb: "",
    postcode: "",
    addressLine1: "",
    lat: 18.5204,
    lng: 73.8567,
    catalogItems: [],
    menuCategories: [],
    hours: emptyDayHours(),
    specialHours: [],
    temporarilyClosed: false,
    photos: [],
    bookingUrl: "",
    orderUrl: "",
    social: {},
    submittedAt: null,
    submittedBusinessId: null,
    verificationStatus: "UNCLAIMED",
  };
}
