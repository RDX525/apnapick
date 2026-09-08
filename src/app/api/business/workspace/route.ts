import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { canManageBusiness } from "@/services/business/ownership";

export const dynamic = "force-dynamic";

/**
 * Persist dashboard workspace snapshot for authenticated owners.
 * Anonymous clients keep localStorage only.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = (await request.json()) as {
      workspace?: { profile?: { businessId?: string } };
    };
    const businessId = body.workspace?.profile?.businessId;

    if (!user) {
      return jsonOk({ ok: true, persisted: false });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase || !businessId) {
      return jsonOk({ ok: true, persisted: false });
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, user_id, role, permissions")
      .eq("business_id", businessId)
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
            permissions: (membership.permissions as string[]) ?? [],
          }
        : null,
    });

    if (!allowed) {
      throw new AppError({
        message: "Forbidden",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "dashboard_workspace_saved",
      entity_type: "business",
      entity_id: businessId,
      metadata: { source: "dashboard" },
    });

    return jsonOk({ ok: true, persisted: true });
  } catch (error) {
    return jsonError(error);
  }
}
