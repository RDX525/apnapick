/**
 * Payment provider abstraction.
 * Product code must never import Razorpay SDK types outside integrations/payments.
 */

export type PaidPlanCode = "premium" | "business";

export type CheckoutSessionInput = {
  businessId: string;
  planCode: PaidPlanCode;
  /** Razorpay Plan id — from plans.external_price_id or env map */
  priceId: string;
  expectedAmountCents: number;
  expectedCurrency: string;
  expectedInterval: "month" | "year";
  customerEmail?: string | null;
  externalCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export type CheckoutSessionResult = {
  provider: PaymentProviderId;
  sessionId: string;
  /** Hosted checkout URL — client redirects here. Never mark paid on redirect. */
  url: string;
};

export type BillingPortalInput = {
  externalCustomerId: string;
  returnUrl: string;
};

export type BillingPortalResult = {
  url: string;
};

/** Normalized webhook envelope after signature verification. */
export type VerifiedWebhookEvent = {
  id: string;
  type: string;
  /** Provider object payload (subscription, invoice, payment, …) */
  dataObject: Record<string, unknown>;
  created: number;
  livemode: boolean;
  raw: unknown;
};

export type PaymentProviderId = "razorpay" | "stub";

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createBillingPortalSession(input: BillingPortalInput): Promise<BillingPortalResult>;
  /**
   * Verify signature and parse. Throws on invalid signature.
   * Callers must process via the billing webhook service (idempotent).
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signatureHeader: string,
    eventIdHeader?: string | null,
  ): Promise<VerifiedWebhookEvent>;
}
