import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { canManageBusiness, recordOwnershipChange } from "@/services/business/ownership";
import { assertBusinessEntitlement } from "@/services/billing/subscription-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["invite", "remove"]),
  businessId: z.string().uuid(),
  email: z.string().email().optional(),
  memberId: z.string().uuid().optional(),
});

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

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      // Local/dev without DB — acknowledge after client-side ownership check
      return jsonOk({ ok: true, persisted: false });
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, user_id, role, permissions")
      .eq("business_id", parsed.data.businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const allowed =
      membership?.role === "OWNER" ||
      canManageBusiness({
        userId: user.id,
        roles: user.roles,
        membership: membership
          ? {
              businessId: membership.business_id as string,
              userId: membership.user_id as string,
              role: membership.role as "OWNER" | "STAFF",
              permissions: (membership.permissions as string[]) ?? [],
            }
          : null,
      });

    // Only owners may invite/remove
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
    }

    const events: Parameters<typeof recordOwnershipChange>[0] = [];
    if (parsed.data.action === "invite") {
      recordOwnershipChange(events, {
        action: "member_added",
        businessId: parsed.data.businessId,
        actorId: user.id,
        toRole: "STAFF",
        meta: { email: parsed.data.email },
      });
    } else {
      recordOwnershipChange(events, {
        action: "member_removed",
        businessId: parsed.data.businessId,
        actorId: user.id,
        subjectUserId: parsed.data.memberId,
      });
    }

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
