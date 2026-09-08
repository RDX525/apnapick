import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { requireAdminSession } from "@/lib/auth/admin";
import { writeAdminAudit } from "@/services/admin/audit";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { hasSupabaseConfig } from "@/config/env";

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
    patch: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("user"),
    userId: z.string().uuid(),
    action: z.enum(["view", "suspend", "restore"]),
  }),
  z.object({
    type: z.literal("content"),
    contentId: z.string().uuid(),
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

    if (body.type === "business" && body.action === "merge_duplicate") {
      await requireAdminSession("admin:merge");
    }

    if (hasSupabaseConfig() && (body.type === "business" || body.type === "claim")) {
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
          message: mutation.error.message,
          code: "ADMIN_MUTATION_FAILED",
          status: 400,
          expose: true,
          cause: mutation.error,
        });
      }
      const result = mutation.data as { auditId?: string } | null;
      persistedAuditId = result?.auditId ?? null;
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
