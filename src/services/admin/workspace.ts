import type { AdminWorkspace } from "@/domain/admin/types";

function uid() {
  return crypto.randomUUID();
}

export const ADMIN_STORAGE_KEY = "apnapick.admin.workspace.v1";

export function createEmptyAdminWorkspace(): AdminWorkspace {
  return {
    claims: [],
    businesses: [],
    users: [],
    categories: [],
    content: [],
    reports: [],
    searchAnalytics: [],
    seoPages: [],
    subscriptions: [],
    payments: [],
    auditLogs: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createSeedAdminWorkspace(): AdminWorkspace {
  const claimId = uid();
  const businessId = "11111111-1111-1111-1111-111111111101";
  const now = new Date().toISOString();

  return {
    claims: [
      {
        id: claimId,
        businessId,
        businessName: "Spice Route Kitchen",
        claimantId: uid(),
        claimantName: "Asha Patel",
        claimantEmail: "asha@spiceroute.example",
        status: "UNDER_REVIEW",
        submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        evidence: [
          {
            type: "document",
            note: "GST certificate upload",
            url: "#",
          },
          { type: "phone", note: "Matched listing phone +91 98765 43210" },
        ],
        history: [
          {
            at: new Date(Date.now() - 86400000 * 2).toISOString(),
            action: "claim_created",
            by: "asha@spiceroute.example",
          },
          {
            at: new Date(Date.now() - 86400000).toISOString(),
            action: "moved_to_under_review",
            by: "system",
          },
        ],
        notes: null,
      },
      {
        id: uid(),
        businessId: uid(),
        businessName: "Fade Room Barbers",
        claimantId: uid(),
        claimantName: "Vikram Shah",
        claimantEmail: "vikram@faderoom.example",
        status: "PENDING",
        submittedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        evidence: [{ type: "email", note: "Domain email pending" }],
        history: [
          {
            at: new Date(Date.now() - 3600000 * 8).toISOString(),
            action: "claim_created",
            by: "vikram@faderoom.example",
          },
        ],
        notes: null,
      },
    ],
    businesses: [
      {
        id: businessId,
        name: "Spice Route Kitchen",
        slug: "spice-route-kitchen",
        status: "PENDING_REVIEW",
        isClaimed: false,
        verifiedAt: null,
        suburb: "Koregaon Park",
        city: "Pune",
        completeness: 72,
        reportCount: 1,
        ownerEditPending: false,
      },
      {
        id: uid(),
        name: "Curry Leaf Co.",
        slug: "curry-leaf-co",
        status: "PUBLISHED",
        isClaimed: true,
        verifiedAt: now,
        suburb: "FC Road",
        city: "Pune",
        completeness: 88,
        reportCount: 0,
        ownerEditPending: true,
      },
      {
        id: uid(),
        name: "Spice Route KP (dup?)",
        slug: "spice-route-kp",
        status: "DRAFT",
        isClaimed: false,
        verifiedAt: null,
        suburb: "Koregaon Park",
        city: "Pune",
        completeness: 40,
        reportCount: 2,
        ownerEditPending: false,
      },
    ],
    users: [
      {
        id: uid(),
        email: "asha@spiceroute.example",
        displayName: "Asha Patel",
        roles: ["BUSINESS_OWNER"],
        status: "active",
        createdAt: now,
      },
      {
        id: uid(),
        email: "spammy@example.com",
        displayName: "Spam Account",
        roles: ["USER"],
        status: "active",
        createdAt: now,
      },
    ],
    categories: [
      { id: uid(), slug: "restaurants", name: "Restaurants", active: true },
      { id: uid(), slug: "cafes", name: "Cafés", active: true },
      { id: uid(), slug: "barbers", name: "Barbers", active: true },
      {
        id: uid(),
        slug: "beauty-personal-care",
        name: "Beauty & Personal Care",
        active: true,
      },
      { id: uid(), slug: "plumbers", name: "Plumbers", active: true },
    ],
    content: [
      {
        id: uid(),
        kind: "product",
        businessName: "Spice Route Kitchen",
        title: "Chicken curry",
        body: "Traditional gravy",
        status: "visible",
      },
      {
        id: uid(),
        kind: "review",
        businessName: "Curry Leaf Co.",
        title: "Suspicious review",
        body: "Buy followers here!!!",
        status: "flagged",
      },
      {
        id: uid(),
        kind: "description",
        businessName: "Fade Room Barbers",
        title: "Business description",
        body: "Best fades in Pune. Walk-ins welcome.",
        status: "visible",
      },
      {
        id: uid(),
        kind: "photo",
        businessName: "Spice Route Kitchen",
        title: "gallery-3.jpg",
        body: null,
        status: "flagged",
      },
      {
        id: uid(),
        kind: "service",
        businessName: "Fade Room Barbers",
        title: "Skin fade",
        body: "₹400",
        status: "visible",
      },
    ],
    reports: [
      {
        id: uid(),
        reason: "incorrect_information",
        details: "Wrong phone number on listing",
        targetType: "business",
        targetId: businessId,
        targetLabel: "Spice Route Kitchen",
        status: "OPEN",
        reporterEmail: "neighbor@example.com",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: uid(),
        reason: "abuse",
        details: "Harassment in review replies",
        targetType: "user",
        targetId: uid(),
        targetLabel: "Spam Account",
        status: "OPEN",
        reporterEmail: "mod@example.com",
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: uid(),
        reason: "duplicate",
        details: "Looks like the same restaurant as Spice Route Kitchen",
        targetType: "business",
        targetId: businessId,
        targetLabel: "Spice Route KP (dup?)",
        status: "OPEN",
        reporterEmail: "user@example.com",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: uid(),
        reason: "spam",
        details: "Review looks automated",
        targetType: "review",
        targetId: uid(),
        targetLabel: "Suspicious review",
        status: "OPEN",
        reporterEmail: null,
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      },
      {
        id: uid(),
        reason: "closed_business",
        details: "Permanently closed last month",
        targetType: "business",
        targetId: uid(),
        targetLabel: "Old Cafe Baner",
        status: "IN_REVIEW",
        reporterEmail: "local@example.com",
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ],
    searchAnalytics: [
      {
        query: "best chicken curry near me",
        count: 214,
        area: "pune",
        lastSeen: now,
      },
      {
        query: "best barber for fade",
        count: 96,
        area: "baner",
        lastSeen: now,
      },
      {
        query: "misal pav near me",
        count: 71,
        area: "kothrud",
        lastSeen: now,
      },
    ],
    seoPages: [
      {
        id: uid(),
        path: "/restaurants/pune",
        title: "Restaurants in Pune",
        indexable: true,
        businessCount: 12,
      },
      {
        id: uid(),
        path: "/barbers/hinjewadi",
        title: "Barbers in Hinjewadi",
        indexable: false,
        businessCount: 1,
      },
    ],
    subscriptions: [
      {
        id: uid(),
        businessName: "Curry Leaf Co.",
        plan: "Free",
        status: "active",
        amountCents: 0,
        renewsAt: null,
      },
    ],
    payments: [],
    auditLogs: [
      {
        id: uid(),
        action: "admin_console_opened",
        entityType: "system",
        entityId: null,
        actorEmail: "admin@localhost",
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function loadAdminWorkspace(): AdminWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminWorkspace;
  } catch {
    return null;
  }
}

export function saveAdminWorkspace(workspace: AdminWorkspace) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    ADMIN_STORAGE_KEY,
    JSON.stringify({ ...workspace, updatedAt: new Date().toISOString() }),
  );
}
