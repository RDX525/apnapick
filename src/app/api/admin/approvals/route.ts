import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { hasServiceRoleKey } from "@/config/env";
import type {
  AdminBusiness,
  AdminClaim,
  AdminReport,
  AdminUser,
} from "@/domain/admin/types";

export const dynamic = "force-dynamic";

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
    await requireAdminSession("admin:moderate");
    if (!hasServiceRoleKey()) {
      throw new AppError({
        message: "Admin database credentials are unavailable",
        code: "ADMIN_DATABASE_UNAVAILABLE",
        status: 503,
        expose: true,
      });
    }
    const supabase = createAdminClient();

    const [
      businessResult,
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
    ] = await Promise.all([
        supabase
          .from("businesses")
          .select(
            "id, name, slug, description, status, is_claimed, verified_at, completeness, metadata, business_locations(suburb, city)",
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("business_claims")
          .select(
            "id, business_id, claimant_id, status, evidence, notes, created_at, businesses(name), profiles!business_claims_claimant_id_fkey(display_name)",
          )
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabase.from("profiles").select("id, display_name, created_at").limit(1000),
        supabase.from("user_roles").select("user_id, role").limit(5000),
        supabase
          .from("verification_events")
          .select("claim_id, event_type, payload, created_at, created_by")
          .order("created_at", { ascending: true })
          .limit(2000),
        supabase
          .from("reports")
          .select(
            "id, reason, details, target_type, target_id, status, reporter_id, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("categories")
          .select("id, slug, name, is_active")
          .order("sort_order")
          .limit(500),
        supabase
          .from("audit_logs")
          .select("id, actor_id, action, entity_type, entity_id, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("products")
          .select("id, name, description, businesses(name)")
          .is("deleted_at", null)
          .limit(1000),
        supabase
          .from("services")
          .select("id, name, description, businesses(name)")
          .is("deleted_at", null)
          .limit(1000),
        supabase
          .from("photos")
          .select("id, storage_path, alt_text, businesses(name)")
          .is("deleted_at", null)
          .limit(1000),
        supabase
          .from("reviews")
          .select("id, title, body, status, businesses(name)")
          .is("deleted_at", null)
          .limit(1000),
      ]);

    const firstError =
      businessResult.error ??
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
      reviewsResult.error;
    if (firstError) {
      throw new AppError({
        message: firstError.message,
        code: "ADMIN_APPROVALS_LOAD_FAILED",
        status: 500,
        expose: true,
        cause: firstError,
      });
    }

    const authUsers = authUsersResult.data.users;
    const emails = new Map(
      authUsers.map((user) => [user.id, String(user.email ?? "")]),
    );
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
      if (row.target_type !== "business") continue;
      const id = String(row.target_id);
      reportCounts.set(id, (reportCounts.get(id) ?? 0) + 1);
    }

    const businesses: AdminBusiness[] = (businessResult.data ?? []).map((row) => {
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
      const business = row.businesses as unknown as { name?: string } | null;
      const profile = row.profiles as unknown as { display_name?: string } | null;
      return {
        id: String(row.id),
        businessId: String(row.business_id),
        businessName: business?.name ?? "Unknown business",
        claimantId: String(row.claimant_id),
        claimantName: profile?.display_name ?? "Unknown user",
        claimantEmail: emails.get(String(row.claimant_id)) ?? "",
        status: row.status as AdminClaim["status"],
        submittedAt: String(row.created_at),
        evidence: evidenceItems(row.evidence),
        history: eventsByClaim.get(String(row.id)) ?? [],
        notes: (row.notes as string | null) ?? null,
      };
    });

    const users: AdminUser[] = authUsers.map((user) => {
      const profile = profiles.get(user.id);
      return {
        id: user.id,
        email: String(user.email ?? ""),
        displayName:
          profile?.displayName || String(user.user_metadata?.display_name ?? user.email ?? ""),
        roles: rolesByUser.get(user.id) ?? ["USER"],
        status: user.banned_until ? "suspended" : "active",
        createdAt: profile?.createdAt ?? user.created_at,
      };
    });

    const reports: AdminReport[] = (reportsResult.data ?? []).map((row) => ({
      id: String(row.id),
      reason: row.reason as AdminReport["reason"],
      details: (row.details as string | null) ?? null,
      targetType: row.target_type as AdminReport["targetType"],
      targetId: String(row.target_id),
      targetLabel: String(row.target_id),
      status: row.status as AdminReport["status"],
      reporterEmail: row.reporter_id
        ? (emails.get(String(row.reporter_id)) ?? null)
        : null,
      createdAt: String(row.created_at),
    }));

    const businessName = (relation: unknown) =>
      (relation as { name?: string } | null)?.name ?? "Unknown business";
    const content = [
      ...(businessResult.data ?? [])
        .filter((row) => Boolean(row.description))
        .map((row) => ({
          id: `description:${String(row.id)}`,
          kind: "description" as const,
          businessName: String(row.name),
          title: `${String(row.name)} description`,
          body: String(row.description),
          status: "visible" as const,
        })),
      ...(productsResult.data ?? []).map((row) => ({
        id: String(row.id),
        kind: "product" as const,
        businessName: businessName(row.businesses),
        title: String(row.name),
        body: (row.description as string | null) ?? null,
        status: "visible" as const,
      })),
      ...(servicesResult.data ?? []).map((row) => ({
        id: String(row.id),
        kind: "service" as const,
        businessName: businessName(row.businesses),
        title: String(row.name),
        body: (row.description as string | null) ?? null,
        status: "visible" as const,
      })),
      ...(photosResult.data ?? []).map((row) => ({
        id: String(row.id),
        kind: "photo" as const,
        businessName: businessName(row.businesses),
        title: String(row.alt_text ?? row.storage_path),
        body: String(row.storage_path),
        status: "visible" as const,
      })),
      ...(reviewsResult.data ?? []).map((row) => ({
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
        actorEmail: row.actor_id ? (emails.get(String(row.actor_id)) ?? null) : null,
        createdAt: String(row.created_at),
      })),
      content,
      searchAnalytics: [],
      seoPages: [],
      subscriptions: [],
      payments: [],
    });
  } catch (error) {
    return jsonError(error);
  }
}
