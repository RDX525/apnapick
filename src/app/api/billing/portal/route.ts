import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createBillingPortalForBusiness } from "@/services/billing/checkout-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  businessId: z.string().uuid(),
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
        message: "Invalid portal payload",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data: membership } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", parsed.data.businessId)
        .eq("user_id", user.id)
        .maybeSingle();

      const isAdmin = user.roles.some((r) => r === "ADMIN" || r === "SUPER_ADMIN");
      if (membership?.role !== "OWNER" && !isAdmin) {
        throw new AppError({
          message: "Only owners can manage billing",
          code: "FORBIDDEN",
          status: 403,
          expose: true,
        });
      }
    }

    const result = await createBillingPortalForBusiness({
      businessId: parsed.data.businessId,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
