import "server-only";

import Stripe from "stripe";
import { AppError } from "@/lib/errors/app-error";
import type {
  BillingPortalInput,
  BillingPortalResult,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  VerifiedWebhookEvent,
} from "@/integrations/payments/types";

function requireStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new AppError({
      message: "Stripe is not configured",
      code: "BILLING_NOT_CONFIGURED",
      status: 503,
      expose: true,
    });
  }
  return new Stripe(key, {
    apiVersion: "2026-08-26.dahlia",
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const stripe = requireStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.externalCustomerId || undefined,
      customer_email: input.externalCustomerId
        ? undefined
        : (input.customerEmail ?? undefined),
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.businessId,
      metadata: {
        business_id: input.businessId,
        plan_code: input.planCode,
        ...input.metadata,
      },
      subscription_data: {
        metadata: {
          business_id: input.businessId,
          plan_code: input.planCode,
        },
      },
    });

    if (!session.url) {
      throw new AppError({
        message: "Checkout session missing URL",
        code: "BILLING_CHECKOUT_FAILED",
        status: 502,
        expose: true,
      });
    }

    return {
      provider: this.id,
      sessionId: session.id,
      url: session.url,
    };
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<BillingPortalResult> {
    const stripe = requireStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: input.externalCustomerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  async constructWebhookEvent(
    payload: string | Buffer,
    signatureHeader: string,
  ): Promise<VerifiedWebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError({
        message: "Stripe webhook secret is not configured",
        code: "BILLING_NOT_CONFIGURED",
        status: 503,
        expose: false,
      });
    }

    const stripe = requireStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signatureHeader, secret);
    } catch {
      throw new AppError({
        message: "Invalid Stripe webhook signature",
        code: "WEBHOOK_SIGNATURE_INVALID",
        status: 400,
        expose: true,
      });
    }

    return {
      id: event.id,
      type: event.type,
      dataObject: asRecord(event.data.object),
      created: event.created,
      livemode: event.livemode,
      raw: event,
    };
  }
}
