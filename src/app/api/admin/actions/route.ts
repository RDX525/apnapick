import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/auth/admin";
import { writeAdminAudit } from "@/services/admin/audit";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createAdminDataClient } from "@/lib/db/supabase-admin";
import { hasSupabaseConfig } from "@/config/env";
import { publicMutationMessage } from "@/lib/errors/public-message";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("claim"),
    claimId: z.string().uuid(),
    action: z.enum(["approve", "reject", "request_more_info", "suspend", "verify"]),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("business"),
    businessId: z.string().uuid(),
    action: z.enum(["approve", "reject", "suspend", "merge_duplicate", "edit", "verify"]),
    mergeIntoId: z.string().uuid().optional(),
  }),
  z.object({
    type: z.literal("user"),
    userId: z.string().uuid(),
    action: z.enum(["suspend", "restore"]),
  }),
  z.object({
    type: z.literal("content"),
    contentId: z.string().uuid(),
    contentKind: z.enum(["product", "service", "photo", "description", "review"]),
    status: z.enum(["visible", "hidden", "flagged"]),
  }),
  z.object({
    type: z.literal("report"),
    reportId: z.string().uuid(),
    status: z.enum(["RESOLVED", "DISMISSED", "IN_REVIEW"]),
  }),
  z.object({
    type: z.literal("category"),
    categoryId: z.string().uuid(),
    active: z.boolean(),
  }),
  z.object({
    type: z.literal("seo"),
    pageId: z.string().uuid(),
    indexable: z.boolean(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    // Server-side only — never trust client role claims
    const permission =
      request.headers.get("x-admin-permission") === "settings"
        ? "admin:settings"
        : "admin:moderate";
    const actor = await requireAdminSession(
      permission === "admin:settings" ? "admin:settings" : "admin:moderate",
    );

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid admin action",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    const body = parsed.data;
    let action = "";
    let entityType = "";
    let entityId: string | null = null;
    const newData: Record<string, unknown> = { ...body };
    let persistedAuditId: string | null = null;
    const databaseConfigured = hasSupabaseConfig();
    const adminData = await createAdminDataClient();
    if (databaseConfigured && !adminData) {
      throw new AppError({
        message: "Admin database is unavailable",
        code: "ADMIN_DATABASE_UNAVAILABLE",
        status: 503,
        expose: true,
      });
    }
    const adminSupabase = adminData?.supabase ?? null;
    const canManageAuthUsers = adminData?.canManageAuthUsers ?? false;

    if (body.type === "business" && body.action === "merge_duplicate") {
      await requireAdminSession("admin:merge");
    }

    if (databaseConfigured && (body.type === "business" || body.type === "claim")) {
      const supabase = await createServerSupabaseClient();
      if (!supabase) {
        throw new AppError({
          message: "Admin database is unavailable",
          code: "ADMIN_DATABASE_UNAVAILABLE",
          status: 503,
          expose: true,
        });
      }

      const mutation =
        body.type === "business"
          ? await supabase.rpc("admin_moderate_business", {
              p_business_id: body.businessId,
              p_action: body.action,
              p_merge_into_id: body.mergeIntoId ?? null,
            })
          : await supabase.rpc("admin_moderate_claim", {
              p_claim_id: body.claimId,
              p_action: body.action,
              p_note: body.note ?? null,
            });

      if (mutation.error) {
        throw new AppError({
          message: publicMutationMessage(
            mutation.error.message,
            "Couldn’t complete that admin action.",
          ),
          code: "ADMIN_MUTATION_FAILED",
          status: 400,
          expose: true,
          cause: mutation.error,
        });
      }
      const result = mutation.data as { auditId?: string } | null;
      persistedAuditId = result?.auditId ?? null;
    }

    if (adminSupabase) {
      let mutationError: { message: string } | null = null;
      if (body.type === "user") {
        if (!canManageAuthUsers) {
          throw new AppError({
            message:
              "Suspending or restoring users needs SUPABASE_SERVICE_ROLE_KEY on the server",
            code: "ADMIN_DATABASE_UNAVAILABLE",
            status: 503,
            expose: true,
          });
        }
        const result = await adminSupabase.auth.admin.updateUserById(body.userId, {
          ban_duration: body.action === "suspend" ? "876000h" : "none",
        });
        mutationError = result.error;
      } else if (body.type === "report") {
        const result = await adminSupabase
          .from("reports")
          .update({
            status: body.status === "IN_REVIEW" ? "UNDER_REVIEW" : body.status,
            resolved_by:
              body.status === "RESOLVED" || body.status === "DISMISSED" ? actor.id : null,
            resolved_at:
              body.status === "RESOLVED" || body.status === "DISMISSED"
                ? new Date().toISOString()
                : null,
          })
          .eq("id", body.reportId);
        mutationError = result.error;
      } else if (body.type === "category") {
        const result = await adminSupabase
          .from("categories")
          .update({ is_active: body.active })
          .eq("id", body.categoryId);
        mutationError = result.error;
      } else if (body.type === "seo") {
        const result = await adminSupabase
          .from("seo_pages")
          .update({ indexable: body.indexable })
          .eq("id", body.pageId);
        mutationError = result.error;
      } else if (body.type === "content") {
        if (body.contentKind === "review") {
          const reviewStatus =
            body.status === "visible"
              ? "PUBLISHED"
              : body.status === "flagged"
                ? "PENDING"
                : "HIDDEN";
          const result = await adminSupabase
            .from("reviews")
            .update({ status: reviewStatus })
            .eq("id", body.contentId);
          mutationError = result.error;
        } else if (body.contentKind === "product" || body.contentKind === "service") {
          const table = body.contentKind === "product" ? "products" : "services";
          const existing = await adminSupabase
            .from(table)
            .select("metadata, is_available")
            .eq("id", body.contentId)
            .single();
          mutationError = existing.error;
          if (!mutationError) {
            const metadata =
              existing.data?.metadata &&
              typeof existing.data.metadata === "object" &&
              !Array.isArray(existing.data.metadata)
                ? existing.data.metadata
                : {};
            const result = await adminSupabase
              .from(table)
              .update({
                is_available:
                  body.status === "flagged"
                    ? Boolean(existing.data?.is_available)
                    : body.status === "visible",
                metadata: {
                  ...metadata,
                  adminModerationStatus: body.status,
                },
              })
              .eq("id", body.contentId);
            mutationError = result.error;
          }
        } else if (body.contentKind === "photo") {
          if (body.status !== "flagged") {
            const result = await adminSupabase
              .from("photos")
              .update({
                deleted_at: body.status === "visible" ? null : new Date().toISOString(),
              })
              .eq("id", body.contentId);
            mutationError = result.error;
          }
        } else {
          const existing = await adminSupabase
            .from("businesses")
            .select("description, metadata")
            .eq("id", body.contentId)
            .single();
          mutationError = existing.error;
          if (!mutationError) {
            const metadata =
              existing.data?.metadata &&
              typeof existing.data.metadata === "object" &&
              !Array.isArray(existing.data.metadata)
                ? existing.data.metadata
                : {};
            const descriptionBackup =
              typeof metadata.adminModeratedDescriptionBackup === "string"
                ? metadata.adminModeratedDescriptionBackup
                : null;
            const result = await adminSupabase
              .from("businesses")
              .update({
                description:
                  body.status === "hidden"
                    ? null
                    : body.status === "visible"
                      ? (existing.data?.description ?? descriptionBackup)
                      : existing.data?.description,
                metadata: {
                  ...metadata,
                  adminModerationStatus: body.status,
                  adminModeratedDescriptionBackup:
                    body.status === "hidden"
                      ? (existing.data?.description ?? descriptionBackup)
                      : descriptionBackup,
                },
              })
              .eq("id", body.contentId);
            mutationError = result.error;
          }
        }
      }

      if (mutationError) {
        throw new AppError({
          message: publicMutationMessage(
            mutationError.message,
            "Couldn’t complete that admin action.",
          ),
          code: "ADMIN_MUTATION_FAILED",
          status: 400,
          expose: true,
          cause: mutationError,
        });
      }
    }

    switch (body.type) {
      case "claim":
        action = `claim_${body.action}`;
        entityType = "business_claim";
        entityId = body.claimId;
        break;
      case "business":
        action = `business_${body.action}`;
        entityType = "business";
        entityId = body.businessId;
        break;
      case "user":
        action = `user_${body.action}`;
        entityType = "user";
        entityId = body.userId;
        break;
      case "content":
        action = `content_${body.status}`;
        entityType = "content";
        entityId = body.contentId;
        break;
      case "report":
        action = `report_${body.status.toLowerCase()}`;
        entityType = "report";
        entityId = body.reportId;
        break;
      case "category":
        action = body.active ? "category_activate" : "category_deactivate";
        entityType = "category";
        entityId = body.categoryId;
        break;
      case "seo":
        action = body.indexable ? "seo_index" : "seo_noindex";
        entityType = "seo_page";
        entityId = body.pageId;
        break;
    }

    const audit = persistedAuditId
      ? {
          id: persistedAuditId,
          actorId: actor.id,
          actorEmail: actor.email,
          action,
          entityType,
          entityId,
          newData,
          createdAt: new Date().toISOString(),
        }
      : await writeAdminAudit({
          actor,
          action,
          entityType,
          entityId,
          newData,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: request.headers.get("user-agent"),
        });

    return jsonOk({ ok: true, audit });
  } catch (error) {
    return jsonError(error);
  }
}
