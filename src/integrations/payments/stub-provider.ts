import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import type {
  BillingPortalInput,
  BillingPortalResult,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  VerifiedWebhookEvent,
} from "@/integrations/payments/types";

/**
 * Local/dev provider when Razorpay keys are absent.
 * Still never activates subscriptions from the client — webhook path required.
 */
export class StubPaymentProvider implements PaymentProvider {
  readonly id = "stub" as const;

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const sessionId = `stub_cs_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const url = new URL(input.successUrl);
    url.searchParams.set("checkout", "stub");
    url.searchParams.set("session_id", sessionId);
    url.searchParams.set("await_webhook", "1");
    return {
      provider: this.id,
      sessionId,
      url: url.toString(),
    };
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<BillingPortalResult> {
    return { url: input.returnUrl };
  }

  async constructWebhookEvent(
    payload: string | Buffer,
    signatureHeader: string,
    eventIdHeader?: string | null,
  ): Promise<VerifiedWebhookEvent> {
    if (signatureHeader !== "stub" && !signatureHeader.startsWith("stub_")) {
      throw new AppError({
        message: "Invalid stub webhook signature",
        code: "WEBHOOK_SIGNATURE_INVALID",
        status: 400,
        expose: true,
      });
    }

    const rawText = typeof payload === "string" ? payload : payload.toString("utf8");
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new AppError({
        message: "Invalid stub webhook JSON",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const id =
      (eventIdHeader && eventIdHeader.trim()) ||
      (typeof parsed.id === "string" ? parsed.id : null) ||
      `stub_evt_${createHash("sha256").update(rawText).digest("hex").slice(0, 24)}`;

    const type =
      typeof parsed.event === "string"
        ? parsed.event
        : typeof parsed.type === "string"
          ? parsed.type
          : "subscription.activated";

    const payloadBody =
      parsed.payload && typeof parsed.payload === "object"
        ? (parsed.payload as Record<string, unknown>)
        : null;
    const razorpayEntity = (key: string): Record<string, unknown> | null => {
      if (!payloadBody) return null;
      const wrapper = payloadBody[key];
      if (!wrapper || typeof wrapper !== "object") return null;
      const entity = (wrapper as { entity?: unknown }).entity;
      if (entity && typeof entity === "object") return entity as Record<string, unknown>;
      return null;
    };
    const subscription = razorpayEntity("subscription");
    const payment = razorpayEntity("payment");
    const invoice = razorpayEntity("invoice");

    const dataObject =
      subscription ??
      payment ??
      invoice ??
      (parsed.data &&
      typeof parsed.data === "object" &&
      "object" in (parsed.data as object)
        ? ((parsed.data as { object: Record<string, unknown> }).object ?? {})
        : typeof parsed.object === "object" && parsed.object
          ? (parsed.object as Record<string, unknown>)
          : {});

    if (subscription && payment) {
      (dataObject as Record<string, unknown>).payment = payment;
    }
    if (subscription && invoice) {
      (dataObject as Record<string, unknown>).invoice = invoice;
    }

    return {
      id,
      type,
      dataObject,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      raw: parsed,
    };
  }
}
