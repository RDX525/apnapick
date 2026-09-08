export const BUSINESS_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "REJECTED",
  "SUSPENDED",
  "MERGED",
] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export const CLAIM_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export type BusinessSummary = {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  description?: string | null;
  avgRating: number;
  reviewCount: number;
  completeness: number;
  isClaimed: boolean;
  priceLevel?: number | null;
  suburb?: string | null;
  city?: string | null;
  distanceM?: number | null;
  matchedItem?: string | null;
  openNow?: boolean | null;
  categories?: string[];
  imageUrl?: string | null;
};
