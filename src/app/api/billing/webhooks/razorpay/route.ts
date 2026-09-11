import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getPaymentProvider } from "@/integrations/payments/get-payment-provider";
import { processBillingWebhookEvent } from "@/services/billing/webhook-processor";
import { createLogger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = createLogger({ route: "api.billing.webhooks.razorpay" });

/**
 * Razorpay (or stub) webhooks — source of truth for subscription state.
 * Client-side checkout success must never activate a plan.
 */
export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get("x-razorpay-signature") ??
      request.headers.get("x-apnapick-webhook-signature") ??
      "";
    const eventId = request.headers.get("x-razorpay-event-id");

    const payload = await request.text();
    const provider = getPaymentProvider();

    const event = await provider.constructWebhookEvent(payload, signature, eventId);
    const providerId = provider.id === "stub" ? "stub" : "razorpay";

    const result = await processBillingWebhookEvent(event, providerId);
    log.info("webhook_handled", result);

    return jsonOk({
      received: true,
      ...result,
    });
  } catch (error) {
    return jsonError(error);
  }
}
