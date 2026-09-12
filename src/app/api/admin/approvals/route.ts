import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/auth/admin";
import { createAdminDataClient } from "@/lib/db/supabase-admin";
import { isImportedCatalogListing } from "@/lib/business/imported-catalog";
import {
  extraBusinessIdsForAdminLabels,
  keepAdminBusinessRow,
  mergeAdminBusinessRows,
} from "@/services/admin/queue-visibility";
import { actorEmailFromAuditRow } from "@/services/admin/audit";
import { publicMutationMessage } from "@/lib/errors/public-message";
import type {
  AdminBusiness,
  AdminClaim,
  AdminReport,
  AdminUser,
} from "@/domain/admin/types";

export const dynamic = "force-dynamic";

const QUEUE_LIMIT = 150;
const LOOKUP_LIMIT = 200;
const ROLE_LIMIT = 400;
const AUTH_USERS_PAGE = 100;
const NAME_LOOKUP_CHUNK = 200;

const BUSINESS_LISTING_SELECT =
  "id, name, slug, description, status, is_claimed, verified_at, completeness, metadata, business_locations(suburb, city)";

type RelatedBusiness = {
  id?: string;
  name?: string;
  display_name?: string;
  metadata?: Record<string, unknown> | null;
};

function relatedBusiness(relation: unknown): RelatedBusiness | null {
  const value = Array.isArray(relation) ? relation[0] : relation;
  if (!value || typeof value !== "object") return null;
  return value as RelatedBusiness;
}

function evidenceItems(raw: unknown): AdminClaim["evidence"] {
  if (!raw || typeof raw !== "object") return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const value = item as { type?: unknown; note?: unknown; url?: unknown };
      return {
        type: String(value.type ?? "document"),
        note: String(value.note ?? ""),
        url: typeof value.url === "string" ? value.url : undefined,
      };
    });
  }
  return Object.entries(raw as Record<string, unknown>).map(([type, value]) => ({
    type,
    note: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

export async function GET() {
  try {
    const session = await requireAdminSession("admin:moderate");
    const adminData = await createAdminDataClient();
    if (!adminData) {
      throw new AppError({
        message: "Admin database is unavailable",
        code: "ADMIN_DATABASE_UNAVAILABLE",
        status: 503,
        expose: true,
      });
    }
    const { supabase, canManageAuthUsers } = adminData;

    const [
      businessResult,
      reviewResult,
      claimResult,
      authUsersResult,
      profilesResult,
      rolesResult,
      eventsResult,
      reportsResult,
      categoriesResult,
      auditResult,
      productsResult,
      servicesResult,
      photosResult,
      reviewsResult,
      searchesResult,
      seoPagesResult,
      subscriptionsResult,
      paymentsResult,
    ] = await Promise.all([
      supabase
        .from("businesses")
        .select(BUSINESS_LISTING_SELECT)
        .is("deleted_at", null)
        .or("metadata->>source.is.null,metadata->>source.neq.openstreetmap")
        .order("created_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("businesses")
        .select(BUSINESS_LISTING_SELECT)
        .is("deleted_at", null)
        .or(
          "status.in.(DRAFT,PENDING_REVIEW),metadata->>ownerEditPending.eq.true",
        )
        .order("updated_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("business_claims")
        .select(
          "id, business_id, claimant_id, status, evidence, notes, created_at, businesses(id, name, metadata), profiles!business_claims_claimant_id_fkey(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      canManageAuthUsers
        ? supabase.auth.admin.listUsers({ page: 1, perPage: AUTH_USERS_PAGE })
        : Promise.resolve({ data: { users: [] }, error: null }),
      supabase.from("profiles").select("id, display_name, created_at").limit(LOOKUP_LIMIT),
      supabase.from("user_roles").select("user_id, role").limit(ROLE_LIMIT),
      supabase
        .from("verification_events")
        .select("claim_id, event_type, payload, created_at, created_by")
        .order("created_at", { ascending: true })
        .limit(LOOKUP_LIMIT),
      supabase
        .from("reports")
        .select(
          "id, reason, details, target_type, target_id, status, reporter_id, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("categories")
        .select("id, slug, name, is_active")
        .order("sort_order")
        .limit(500),
      supabase
        .from("audit_logs")
        .select("id, actor_id, action, entity_type, entity_id, new_data, created_at")
        .order("created_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("products")
        .select(
          "id, name, description, is_available, metadata, businesses(id, name, metadata)",
        )
        .is("deleted_at", null)
        .limit(QUEUE_LIMIT),
      supabase
        .from("services")
        .select(
          "id, name, description, is_available, metadata, businesses(id, name, metadata)",
        )
        .is("deleted_at", null)
        .limit(QUEUE_LIMIT),
      supabase
        .from("photos")
        .select("id, storage_path, alt_text, deleted_at, businesses(id, name, metadata)")
        .limit(QUEUE_LIMIT),
      supabase
        .from("reviews")
        .select("id, title, body, status, businesses(id, name, metadata)")
        .is("deleted_at", null)
        .limit(QUEUE_LIMIT),
      supabase
        .from("searches")
        .select("normalized_query, hit_count, last_seen_at")
        .order("hit_count", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("seo_pages")
        .select("id, path, title, indexable, business_count")
        .order("updated_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("subscriptions")
        .select(
          "id, status, current_period_end, plans(name, price_cents), businesses(id, name, metadata)",
        )
        .order("updated_at", { ascending: false })
        .limit(QUEUE_LIMIT),
      supabase
        .from("payments")
        .select("id, amount_cents, status, created_at, businesses(id, name, metadata)")
        .order("created_at", { ascending: false })
        .limit(QUEUE_LIMIT),
    ]);

    const firstError =
      businessResult.error ??
      reviewResult.error ??
      claimResult.error ??
      authUsersResult.error ??
      profilesResult.error ??
      rolesResult.error ??
      eventsResult.error ??
      reportsResult.error ??
      categoriesResult.error ??
      auditResult.error ??
      productsResult.error ??
      servicesResult.error ??
      photosResult.error ??
      reviewsResult.error ??
      searchesResult.error ??
      seoPagesResult.error ??
      subscriptionsResult.error ??
      paymentsResult.error;
    if (firstError) {
      throw new AppError({
        message: publicMutationMessage(
          firstError.message,
          "Couldn’t load the admin queues.",
        ),
        code: "ADMIN_APPROVALS_LOAD_FAILED",
        status: 500,
        expose: true,
        cause: firstError,
      });
    }

    const authUsers = authUsersResult.data?.users ?? [];
    const emails = new Map(
      authUsers.map((user) => [user.id, String(user.email ?? "")]),
    );
    if (session.email) emails.set(session.id, session.email);
    if (canManageAuthUsers) {
      const missingActorIds = [
        ...new Set(
          (auditResult.data ?? [])
            .map((row) => (row.actor_id ? String(row.actor_id) : ""))
            .filter((id) => id && !emails.get(id)),
        ),
      ];
      const lookedUp = await Promise.all(
        missingActorIds.slice(0, 30).map(async (id) => {
          const { data } = await supabase.auth.admin.getUserById(id);
          return [id, data.user?.email ? String(data.user.email) : ""] as const;
        }),
      );
      for (const [id, email] of lookedUp) {
        if (email) emails.set(id, email);
      }
    }
    const profiles = new Map(
      (profilesResult.data ?? []).map((profile) => [
        String(profile.id),
        {
          displayName: String(profile.display_name ?? ""),
          createdAt: String(profile.created_at),
        },
      ]),
    );
    const rolesByUser = new Map<string, string[]>();
    for (const row of rolesResult.data ?? []) {
      const id = String(row.user_id);
      rolesByUser.set(id, [...(rolesByUser.get(id) ?? []), String(row.role)]);
    }
    const reportCounts = new Map<string, number>();
    for (const row of reportsResult.data ?? []) {
      if (String(row.target_type).toUpperCase() !== "BUSINESS") continue;
      const id = String(row.target_id);
      reportCounts.set(id, (reportCounts.get(id) ?? 0) + 1);
    }

    const businessRows = mergeAdminBusinessRows(
      (reviewResult.data ?? []).filter((row) =>
        keepAdminBusinessRow(
          String(row.id),
          (row.metadata as Record<string, unknown> | null) ?? null,
          { includeOpenStreetMap: true },
        ),
      ),
      (businessResult.data ?? []).filter((row) =>
        keepAdminBusinessRow(
          String(row.id),
          (row.metadata as Record<string, unknown> | null) ?? null,
          { includeOpenStreetMap: false },
        ),
      ),
    );
    const extraIds = extraBusinessIdsForAdminLabels(
      businessRows.map((row) => String(row.id)),
      (claimResult.data ?? []).map((row) => String(row.business_id)),
      (reportsResult.data ?? [])
        .filter((row) => String(row.target_type).toUpperCase() === "BUSINESS")
        .map((row) => String(row.target_id)),
    );
    const extraMetadata = new Map<string, Record<string, unknown> | null>();
    const businessNames = new Map(
      businessRows.map((row) => [String(row.id), String(row.name)]),
    );
    for (let i = 0; i < extraIds.length; i += NAME_LOOKUP_CHUNK) {
      const extraResult = await supabase
        .from("businesses")
        .select("id, name, metadata")
        .in("id", extraIds.slice(i, i + NAME_LOOKUP_CHUNK));
      if (extraResult.error) {
        throw new AppError({
          message: publicMutationMessage(
            extraResult.error.message,
            "Couldn’t load the admin queues.",
          ),
          code: "ADMIN_APPROVALS_LOAD_FAILED",
          status: 500,
          expose: true,
          cause: extraResult.error,
        });
      }
      for (const row of extraResult.data ?? []) {
        const id = String(row.id);
        businessNames.set(id, String(row.name));
        extraMetadata.set(
          id,
          row.metadata &&
            typeof row.metadata === "object" &&
            !Array.isArray(row.metadata)
            ? (row.metadata as Record<string, unknown>)
            : null,
        );
      }
    }

    const businesses: AdminBusiness[] = businessRows.map((row) => {
      const locations = (row.business_locations ?? []) as unknown as Array<{
        suburb: string | null;
        city: string | null;
      }>;
      const metadata =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      return {
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        status: row.status as AdminBusiness["status"],
        isClaimed: Boolean(row.is_claimed),
        verifiedAt: (row.verified_at as string | null) ?? null,
        suburb: locations[0]?.suburb ?? null,
        city: locations[0]?.city ?? null,
        completeness: Number(row.completeness ?? 0),
        reportCount: reportCounts.get(String(row.id)) ?? 0,
        ownerEditPending: metadata.ownerEditPending === true,
      };
    });

    const eventsByClaim = new Map<string, AdminClaim["history"]>();
    for (const event of eventsResult.data ?? []) {
      const claimId = String(event.claim_id);
      const history = eventsByClaim.get(claimId) ?? [];
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      history.push({
        at: String(event.created_at),
        action: String(event.event_type),
        by: event.created_by ? String(event.created_by) : "system",
        note: typeof payload.message === "string" ? payload.message : undefined,
      });
      eventsByClaim.set(claimId, history);
    }

    const claims: AdminClaim[] = (claimResult.data ?? []).map((row) => {
      const businessId = String(row.business_id);
      const business = relatedBusiness(row.businesses);
      const profile = relatedBusiness(row.profiles);
      const metadata = business?.metadata ?? extraMetadata.get(businessId) ?? null;
      return {
        id: String(row.id),
        businessId,
        businessName:
          business?.name ?? businessNames.get(businessId) ?? "Unknown business",
        claimantId: String(row.claimant_id),
        claimantName: profile?.display_name || "Unknown user",
        claimantEmail: emails.get(String(row.claimant_id)) ?? "",
        status: row.status as AdminClaim["status"],
        submittedAt: String(row.created_at),
        evidence: evidenceItems(row.evidence),
        history: eventsByClaim.get(String(row.id)) ?? [],
        notes: (row.notes as string | null) ?? null,
        fromCatalog: isImportedCatalogListing(businessId, metadata),
      };
    });

    const users: AdminUser[] =
      authUsers.length > 0
        ? authUsers.map((user) => {
            const profile = profiles.get(user.id);
            return {
              id: user.id,
              email: String(user.email ?? ""),
              displayName:
                profile?.displayName ||
                String(user.user_metadata?.display_name ?? user.email ?? ""),
              roles: rolesByUser.get(user.id) ?? ["USER"],
              status: user.banned_until ? "suspended" : "active",
              createdAt: profile?.createdAt ?? user.created_at,
            };
          })
        : [...profiles.entries()].map(([id, profile]) => ({
            id,
            email: "",
            displayName: profile.displayName || "Unknown user",
            roles: rolesByUser.get(id) ?? ["USER"],
            status: "active" as const,
            createdAt: profile.createdAt,
          }));

    const reports: AdminReport[] = (reportsResult.data ?? []).map((row) => {
      const targetType = String(row.target_type).toLowerCase();
      const targetId = String(row.target_id);
      return {
        id: String(row.id),
        reason: row.reason as AdminReport["reason"],
        details: (row.details as string | null) ?? null,
        targetType: targetType as AdminReport["targetType"],
        targetId,
        targetLabel:
          targetType === "business"
            ? (businessNames.get(targetId) ?? targetId)
            : targetId,
        status:
          String(row.status) === "UNDER_REVIEW"
            ? "IN_REVIEW"
            : (row.status as AdminReport["status"]),
        reporterEmail: row.reporter_id
          ? (emails.get(String(row.reporter_id)) ?? null)
          : null,
        createdAt: String(row.created_at),
      };
    });

    const isRealBusinessRelation = (relation: unknown) => {
      const business = relatedBusiness(relation);
      return Boolean(
        business?.id &&
        !isImportedCatalogListing(String(business.id), business.metadata ?? null),
      );
    };
    const businessName = (relation: unknown) =>
      relatedBusiness(relation)?.name ?? "Unknown business";
    const contentStatus = (
      metadata: unknown,
      fallback: "visible" | "hidden" | "flagged" = "visible",
    ) => {
      const value =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>).adminModerationStatus
          : null;
      return value === "hidden" || value === "flagged" || value === "visible"
        ? value
        : fallback;
    };
    const auditedContentStatus = new Map<string, "visible" | "hidden" | "flagged">();
    for (const row of auditResult.data ?? []) {
      if (
        row.entity_type !== "content" ||
        !row.entity_id ||
        auditedContentStatus.has(String(row.entity_id))
      ) {
        continue;
      }
      const status = String(row.action).replace("content_", "");
      if (status === "visible" || status === "hidden" || status === "flagged") {
        auditedContentStatus.set(String(row.entity_id), status);
      }
    }
    const content = [
      ...businessRows
        .map((row) => {
          const metadata =
            row.metadata &&
            typeof row.metadata === "object" &&
            !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {};
          const backup =
            typeof metadata.adminModeratedDescriptionBackup === "string"
              ? metadata.adminModeratedDescriptionBackup
              : null;
          const description = (row.description as string | null) ?? backup;
          return description
            ? {
                id: String(row.id),
                kind: "description" as const,
                businessName: String(row.name),
                title: `${String(row.name)} description`,
                body: description,
                status: contentStatus(row.metadata),
              }
            : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
      ...(productsResult.data ?? [])
        .filter((row) => isRealBusinessRelation(row.businesses))
        .map((row) => ({
          id: String(row.id),
          kind: "product" as const,
          businessName: businessName(row.businesses),
          title: String(row.name),
          body: (row.description as string | null) ?? null,
          status: contentStatus(row.metadata),
        })),
      ...(servicesResult.data ?? [])
        .filter((row) => isRealBusinessRelation(row.businesses))
        .map((row) => ({
          id: String(row.id),
          kind: "service" as const,
          businessName: businessName(row.businesses),
          title: String(row.name),
          body: (row.description as string | null) ?? null,
          status: contentStatus(row.metadata),
        })),
      ...(photosResult.data ?? [])
        .filter((row) => isRealBusinessRelation(row.businesses))
        .map((row) => ({
          id: String(row.id),
          kind: "photo" as const,
          businessName: businessName(row.businesses),
          title: String(row.alt_text ?? row.storage_path),
          body: String(row.storage_path),
          status:
            auditedContentStatus.get(String(row.id)) ??
            (row.deleted_at ? ("hidden" as const) : ("visible" as const)),
        })),
      ...(reviewsResult.data ?? [])
        .filter((row) => isRealBusinessRelation(row.businesses))
        .map((row) => ({
          id: String(row.id),
          kind: "review" as const,
          businessName: businessName(row.businesses),
          title: String(row.title ?? "Review"),
          body: (row.body as string | null) ?? null,
          status:
            row.status === "PENDING"
              ? ("flagged" as const)
              : row.status === "PUBLISHED"
                ? ("visible" as const)
                : ("hidden" as const),
        })),
    ];

    return jsonOk({
      businesses,
      claims,
      users,
      categories: (categoriesResult.data ?? []).map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
        active: Boolean(row.is_active),
      })),
      reports,
      auditLogs: (auditResult.data ?? []).map((row) => ({
        id: String(row.id),
        action: String(row.action),
        entityType: String(row.entity_type),
        entityId: row.entity_id ? String(row.entity_id) : null,
        actorEmail: actorEmailFromAuditRow(
          row.actor_id ? String(row.actor_id) : null,
          emails,
          row.new_data,
        ),
        createdAt: String(row.created_at),
      })),
      content,
      searchAnalytics: (searchesResult.data ?? []).map((row) => ({
        query: String(row.normalized_query),
        count: Number(row.hit_count ?? 0),
        area: null,
        lastSeen: String(row.last_seen_at),
      })),
      seoPages: (seoPagesResult.data ?? []).map((row) => ({
        id: String(row.id),
        path: String(row.path),
        title: String(row.title),
        indexable: Boolean(row.indexable),
        businessCount: Number(row.business_count ?? 0),
      })),
      subscriptions: (subscriptionsResult.data ?? [])
        .filter((row) => isRealBusinessRelation(row.businesses))
        .map((row) => {
          const plan = row.plans as unknown as {
            name?: string;
            price_cents?: number;
          } | null;
          return {
            id: String(row.id),
            businessName: businessName(row.businesses),
            plan: plan?.name ?? "Unknown",
            status: String(row.status).toLowerCase() as
              "trialing" | "active" | "canceled" | "past_due" | "expired",
            amountCents: Number(plan?.price_cents ?? 0),
            renewsAt: (row.current_period_end as string | null) ?? null,
          };
        }),
      payments: (paymentsResult.data ?? [])
        .filter((row) => isRealBusinessRelation(row.businesses))
        .map((row) => ({
          id: String(row.id),
          businessName: businessName(row.businesses),
          amountCents: Number(row.amount_cents ?? 0),
          status: String(row.status).toLowerCase() as
            "pending" | "succeeded" | "failed" | "refunded",
          createdAt: String(row.created_at),
        })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
