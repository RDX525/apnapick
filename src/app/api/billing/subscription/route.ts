import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { getBusinessEntitlements } from "@/services/billing/subscription-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const businessId = request.nextUrl.searchParams.get("businessId");
    if (!businessId) {
      throw new AppError({
        message: "businessId is required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new AppError({
        message: "Billing requires a database session",
        code: "BILLING_NOT_CONFIGURED",
        status: 503,
        expose: true,
      });
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = user.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
    if (!membership && !isAdmin) {
      throw new AppError({
        message: "Not a member of this business",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    const entitlements = await getBusinessEntitlements(businessId);
    return jsonOk({
      ...entitlements,
      sourceOfTruth: "webhook",
      note: "Do not trust client-side checkout success; wait for subscription status from webhooks.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
