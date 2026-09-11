import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { hasServiceRoleKey } from "@/config/env";
import { createAdminClient } from "@/lib/db/supabase-admin";
import { requireWritableDatabase } from "@/lib/db/require-writable-db";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { publicMutationMessage } from "@/lib/errors/public-message";
import { createLogger } from "@/lib/logging/logger";
import { canManageBusiness, recordOwnershipChange } from "@/services/business/ownership";
import { assertBusinessEntitlement } from "@/services/billing/subscription-service";
import type { TeamMember } from "@/domain/dashboard/types";

export const dynamic = "force-dynamic";

const log = createLogger({ module: "business-team" });

const bodySchema = z.object({
  action: z.enum(["invite", "remove"]),
  businessId: z.string().uuid(),
  email: z.string().email().optional(),
  memberId: z.string().uuid().optional(),
});

const STAFF_PERMISSIONS = { manage_profile: true } as const;

function isUniqueViolation(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  return (
    error.code === "23505" ||
    /duplicate key|unique constraint/i.test(error.message ?? "")
  );
}

async function lookupInvitee(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!hasServiceRoleKey()) {
    throw new AppError({
      message: "Team invites need server configuration.",
      code: "TEAM_LOOKUP_UNAVAILABLE",
      status: 503,
      expose: true,
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, email, display_name")
    .ilike("email", normalized)
    .maybeSingle();

  if (error) {
    log.warn("team_invite_lookup_failed", { message: error.message });
    throw new AppError({
      message: "Couldn’t look up that account.",
      code: "TEAM_LOOKUP_FAILED",
      status: 500,
      expose: true,
      cause: error,
    });
  }

  if (!data?.id) {
    throw new AppError({
      message: "That email doesn’t have an ApnaPick account yet. Ask them to sign up first.",
      code: "TEAM_USER_NOT_FOUND",
      status: 404,
      expose: true,
    });
  }

  return {
    id: String(data.id),
    email: String(data.email ?? normalized),
    displayName: String(data.display_name ?? normalized.split("@")[0] ?? "Staff"),
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Login required",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid team payload",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    const supabase = requireWritableDatabase(
      await createServerSupabaseClient(),
      "Team changes",
    );

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, user_id, role, permissions")
      .eq("business_id", parsed.data.businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const allowed = canManageBusiness({
      userId: user.id,
      roles: user.roles,
      membership: membership
        ? {
            businessId: membership.business_id as string,
            userId: membership.user_id as string,
            role: membership.role as "OWNER" | "STAFF",
            permissions: membership.permissions,
          }
        : null,
    });

    if (
      membership?.role !== "OWNER" &&
      !user.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN")
    ) {
      throw new AppError({
        message: "Only owners can manage team",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    void allowed;

    if (parsed.data.action === "invite") {
      await assertBusinessEntitlement(parsed.data.businessId, "teamMembers");
      const email = parsed.data.email?.trim().toLowerCase();
      if (!email) {
        throw new AppError({
          message: "Enter a teammate email.",
          code: "VALIDATION_ERROR",
          status: 400,
          expose: true,
        });
      }
      if (user.email && user.email.toLowerCase() === email) {
        throw new AppError({
          message: "You’re already on this team.",
          code: "VALIDATION_ERROR",
          status: 400,
          expose: true,
        });
      }

      const invitee = await lookupInvitee(email);
      const now = new Date().toISOString();
      const insert = await supabase
        .from("business_members")
        .insert({
          business_id: parsed.data.businessId,
          user_id: invitee.id,
          role: "STAFF",
          permissions: STAFF_PERMISSIONS,
          invited_by: user.id,
          accepted_at: now,
        })
        .select("id, role, permissions, accepted_at, created_at")
        .maybeSingle();

      if (insert.error) {
        if (isUniqueViolation(insert.error)) {
          throw new AppError({
            message: "That person is already on the team.",
            code: "TEAM_ALREADY_MEMBER",
            status: 409,
            expose: true,
          });
        }
        throw new AppError({
          message: publicMutationMessage(
            insert.error.message,
            "Couldn’t add that teammate.",
          ),
          code: "TEAM_INVITE_FAILED",
          status: 400,
          expose: true,
          cause: insert.error,
        });
      }

      const events: Parameters<typeof recordOwnershipChange>[0] = [];
      recordOwnershipChange(events, {
        action: "member_added",
        businessId: parsed.data.businessId,
        actorId: user.id,
        subjectUserId: invitee.id,
        toRole: "STAFF",
        meta: { email: invitee.email },
      });

      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: events[0]?.action ?? "team_change",
        entity_type: "business",
        entity_id: parsed.data.businessId,
        new_data: events[0] ?? {},
      });

      const member: TeamMember = {
        id: String(insert.data?.id ?? invitee.id),
        email: invitee.email,
        displayName: invitee.displayName,
        role: "STAFF",
        permissions: ["manage_profile"],
        status: insert.data?.accepted_at ? "active" : "invited",
        invitedAt: String(insert.data?.created_at ?? now),
      };

      return jsonOk({ ok: true, persisted: true, member, audit: events[0] });
    }

    if (!parsed.data.memberId) {
      throw new AppError({
        message: "Member required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const { data: target, error: targetError } = await supabase
      .from("business_members")
      .select("id, user_id, role")
      .eq("id", parsed.data.memberId)
      .eq("business_id", parsed.data.businessId)
      .maybeSingle();

    if (targetError) {
      throw new AppError({
        message: publicMutationMessage(targetError.message, "Couldn’t load that teammate."),
        code: "TEAM_REMOVE_FAILED",
        status: 400,
        expose: true,
        cause: targetError,
      });
    }
    if (!target) {
      throw new AppError({
        message: "That teammate isn’t on this listing.",
        code: "NOT_FOUND",
        status: 404,
        expose: true,
      });
    }
    if (target.role === "OWNER") {
      throw new AppError({
        message: "Owners can’t be removed from here.",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    const removed = await supabase
      .from("business_members")
      .delete()
      .eq("id", parsed.data.memberId)
      .eq("business_id", parsed.data.businessId);

    if (removed.error) {
      throw new AppError({
        message: publicMutationMessage(removed.error.message, "Couldn’t remove that teammate."),
        code: "TEAM_REMOVE_FAILED",
        status: 400,
        expose: true,
        cause: removed.error,
      });
    }

    const events: Parameters<typeof recordOwnershipChange>[0] = [];
    recordOwnershipChange(events, {
      action: "member_removed",
      businessId: parsed.data.businessId,
      actorId: user.id,
      subjectUserId: String(target.user_id),
    });

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: events[0]?.action ?? "team_change",
      entity_type: "business",
      entity_id: parsed.data.businessId,
      new_data: events[0] ?? {},
    });

    return jsonOk({ ok: true, persisted: true, audit: events[0] });
  } catch (error) {
    return jsonError(error);
  }
}
