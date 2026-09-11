import { AppError } from "@/lib/errors/app-error";
import { jsonError } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Stripe is no longer used. Point webhooks at /api/billing/webhooks/razorpay. */
export async function POST() {
  return jsonError(
    new AppError({
      message: "Stripe billing is disabled. Use POST /api/billing/webhooks/razorpay.",
      code: "BILLING_PROVIDER_REMOVED",
      status: 410,
      expose: true,
    }),
  );
}
