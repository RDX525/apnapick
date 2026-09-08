import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createCheckoutForBusiness } from "@/services/billing/checkout-service";
import { rateLimit } from "@/lib/security/rate-limit";
import { hasSupabaseConfig } from "@/config/env";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  businessId: z.string().uuid(),
  planCode: z.enum(["premium", "business"]),
});

/**
 * Creates a Checkout session URL. Client redirects — does NOT activate the plan.
 * Activation happens only via Stripe webhooks.
 */
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

    const limited = await rateLimit(`checkout:${user.id}`, 20, 60 * 60 * 1000);
    if (!limited.allowed) {
      throw new AppError({
        message: "Too many checkout attempts",
        code: "RATE_LIMITED",
        status: 429,
        expose: true,
      });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid checkout payload",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    if (!hasSupabaseConfig()) {
      throw new AppError({
        message: "Billing requires Supabase configuration",
        code: "BILLING_NOT_CONFIGURED",
        status: 503,
        expose: true,
      });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new AppError({
        message: "Billing requires Supabase configuration",
        code: "BILLING_NOT_CONFIGURED",
        status: 503,
        expose: true,
      });
    }

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

    const result = await createCheckoutForBusiness({
      businessId: parsed.data.businessId,
      planCode: parsed.data.planCode,
      customerEmail: user.email,
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error);
  }
}
