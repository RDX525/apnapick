import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors/app-error";
import type {
  BillingPortalInput,
  BillingPortalResult,
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  VerifiedWebhookEvent,
} from "@/integrations/payments/types";

const RAZORPAY_API = "https://api.razorpay.com/v1";
const PLACEHOLDER_SECRETS = new Set(["", "your-razorpay-key-secret", "rzp_test_placeholder"]);

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function hasRazorpayConfig(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return Boolean(keyId && secret && !PLACEHOLDER_SECRETS.has(secret));
}

function requireKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !secret || PLACEHOLDER_SECRETS.has(secret)) {
    throw new AppError({
      message: "Razorpay is not configured",
      code: "BILLING_NOT_CONFIGURED",
      status: 503,
      expose: true,
    });
  }
  return { keyId, secret };
}

async function razorpayRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { keyId, secret } = requireKeys();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = asRecord(json.error);
    throw new AppError({
      message: str(error.description) ?? "Razorpay request failed",
      code: "BILLING_PROVIDER_ERROR",
      status: response.status >= 500 ? 502 : 400,
      expose: true,
    });
  }
  return json as T;
}

function expectedPeriod(interval: "month" | "year") {
  return interval === "year" ? "yearly" : "monthly";
}

function verifyWebhookSignature(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function entityFromPayload(
  payload: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const wrapper = asRecord(payload[key]);
  return asRecord(wrapper.entity);
}

function normalizeSubscription(sub: Record<string, unknown>): Record<string, unknown> {
  const notes = asRecord(sub.notes);
  return {
    ...sub,
    object: "subscription",
    customer: sub.customer_id ?? sub.customer,
    current_period_start: sub.current_start ?? sub.start_at,
    current_period_end: sub.current_end ?? sub.end_at,
    canceled_at: sub.ended_at ?? sub.cancelled_at,
    notes,
    metadata: notes,
  };
}

export class RazorpayPaymentProvider implements PaymentProvider {
  readonly id = "razorpay" as const;

  async createCheckoutSession(
    input: CheckoutSessionInput,
  ): Promise<CheckoutSessionResult> {
    const plan = await razorpayRequest<Record<string, unknown>>(
      "GET",
      `/plans/${encodeURIComponent(input.priceId)}`,
    );
    const item = asRecord(plan.item);
    const amount = num(item.amount);
    const currency = str(item.currency) ?? str(plan.currency);
    const period = str(plan.period);

    if (
      amount !== input.expectedAmountCents ||
      (currency ?? "").toLowerCase() !== input.expectedCurrency.toLowerCase() ||
      period !== expectedPeriod(input.expectedInterval)
    ) {
      throw new AppError({
        message:
          "The configured Razorpay plan does not match this listing plan. Update the Razorpay Plan ID before accepting payments.",
        code: "BILLING_PRICE_MISMATCH",
        status: 503,
        expose: true,
      });
    }

    let customerId = input.externalCustomerId || undefined;
    if (!customerId && input.customerEmail) {
      try {
        const customer = await razorpayRequest<Record<string, unknown>>("POST", "/customers", {
          email: input.customerEmail,
          notes: {
            business_id: input.businessId,
            plan_code: input.planCode,
          },
        });
        customerId = str(customer.id) ?? undefined;
      } catch {
        customerId = undefined;
      }
    }

    const subscription = await razorpayRequest<Record<string, unknown>>(
      "POST",
      "/subscriptions",
      {
        plan_id: input.priceId,
        total_count: input.expectedInterval === "year" ? 10 : 120,
        quantity: 1,
        customer_notify: 1,
        ...(customerId ? { customer_id: customerId } : {}),
        notes: {
          business_id: input.businessId,
          plan_code: input.planCode,
          ...input.metadata,
        },
      },
    );

    const url = str(subscription.short_url);
    const sessionId = str(subscription.id);
    if (!url || !sessionId) {
      throw new AppError({
        message: "Checkout session missing URL",
        code: "BILLING_CHECKOUT_FAILED",
        status: 502,
        expose: true,
      });
    }

    return {
      provider: this.id,
      sessionId,
      url,
    };
  }

  async createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<BillingPortalResult> {
    // Razorpay has no Stripe-style hosted customer portal. Manage billing in-app.
    void input.externalCustomerId;
    return { url: input.returnUrl };
  }

  async constructWebhookEvent(
    payload: string | Buffer,
    signatureHeader: string,
    eventIdHeader?: string | null,
  ): Promise<VerifiedWebhookEvent> {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new AppError({
        message: "Razorpay webhook secret is not configured",
        code: "BILLING_NOT_CONFIGURED",
        status: 503,
        expose: false,
      });
    }

    const rawText = typeof payload === "string" ? payload : payload.toString("utf8");
    if (!verifyWebhookSignature(rawText, signatureHeader, secret)) {
      throw new AppError({
        message: "Invalid Razorpay webhook signature",
        code: "WEBHOOK_SIGNATURE_INVALID",
        status: 400,
        expose: true,
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new AppError({
        message: "Invalid Razorpay webhook JSON",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const payloadBody = asRecord(parsed.payload);
    const subscription = entityFromPayload(payloadBody, "subscription");
    const payment = entityFromPayload(payloadBody, "payment");
    const invoice = entityFromPayload(payloadBody, "invoice");
    const primary =
      Object.keys(subscription).length > 0
        ? normalizeSubscription(subscription)
        : Object.keys(payment).length > 0
          ? payment
          : invoice;

    const type = str(parsed.event) ?? "unknown";
    const id =
      (eventIdHeader && eventIdHeader.trim()) ||
      str(parsed.id) ||
      `${type}:${str(primary.id) ?? "unknown"}:${num(parsed.created_at) ?? 0}`;

    return {
      id,
      type,
      dataObject: {
        ...primary,
        payment: Object.keys(payment).length ? payment : undefined,
        invoice: Object.keys(invoice).length ? invoice : undefined,
        subscription:
          Object.keys(subscription).length && primary !== subscription
            ? normalizeSubscription(subscription)
            : undefined,
      },
      created: num(parsed.created_at) ?? Math.floor(Date.now() / 1000),
      livemode: (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_live_"),
      raw: parsed,
    };
  }
}
