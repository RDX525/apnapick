import type { BusinessStatus, ClaimStatus } from "@/domain/business/types";

export type AdminClaim = {
  id: string;
  businessId: string;
  businessName: string;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  status: ClaimStatus;
  submittedAt: string;
  evidence: { type: string; note: string; url?: string }[];
  history: { at: string; action: string; by: string; note?: string }[];
  notes: string | null;
};

export type AdminBusiness = {
  id: string;
  name: string;
  slug: string;
  status: BusinessStatus;
  isClaimed: boolean;
  verifiedAt: string | null;
  suburb: string | null;
  city: string | null;
  completeness: number;
  reportCount: number;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  status: "active" | "suspended";
  createdAt: string;
};

export type AdminReport = {
  id: string;
  reason: "incorrect_information" | "duplicate" | "closed_business" | "spam" | "abuse";
  details: string | null;
  targetType: "business" | "review" | "user" | "photo";
  targetId: string;
  targetLabel: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";
  reporterEmail: string | null;
  createdAt: string;
};

export type AdminContentItem = {
  id: string;
  kind: "product" | "service" | "photo" | "description" | "review";
  businessName: string;
  title: string;
  body: string | null;
  status: "visible" | "hidden" | "flagged";
};

export type AdminSeoPage = {
  id: string;
  path: string;
  title: string;
  indexable: boolean;
  businessCount: number;
};

export type AdminSubscription = {
  id: string;
  businessName: string;
  plan: string;
  status: "active" | "canceled" | "past_due";
  amountCents: number;
  renewsAt: string | null;
};

export type AdminPayment = {
  id: string;
  businessName: string;
  amountCents: number;
  status: "succeeded" | "failed" | "refunded";
  createdAt: string;
};

export type AdminWorkspace = {
  claims: AdminClaim[];
  businesses: AdminBusiness[];
  users: AdminUser[];
  categories: { id: string; slug: string; name: string; active: boolean }[];
  content: AdminContentItem[];
  reports: AdminReport[];
  searchAnalytics: {
    query: string;
    count: number;
    area: string | null;
    lastSeen: string;
  }[];
  seoPages: AdminSeoPage[];
  subscriptions: AdminSubscription[];
  payments: AdminPayment[];
  auditLogs: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    actorEmail: string | null;
    createdAt: string;
  }[];
  updatedAt: string;
};

export type ClaimAdminAction =
  "approve" | "reject" | "request_more_info" | "suspend" | "verify";

export type BusinessAdminAction =
  "approve" | "reject" | "suspend" | "merge_duplicate" | "edit" | "verify";

export type UserAdminAction = "view" | "suspend" | "restore";
