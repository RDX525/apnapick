import "server-only";

import { StripePaymentProvider } from "@/integrations/payments/stripe-provider";
import { StubPaymentProvider } from "@/integrations/payments/stub-provider";
import type { PaymentProvider } from "@/integrations/payments/types";
import { AppError } from "@/lib/errors/app-error";

let cached: PaymentProvider | null = null;

export function hasStripeConfig(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_SECRET_KEY !== "sk_test_placeholder",
  );
}

/**
 * Prefer Stripe when configured.
 * In production, refuse stub webhooks so missing Stripe keys fail closed.
 */
export function createPaymentProvider(): PaymentProvider {
  if (hasStripeConfig()) return new StripePaymentProvider();
  if (process.env.NODE_ENV === "production") {
    throw new AppError({
      message: "Stripe is not configured",
      code: "BILLING_NOT_CONFIGURED",
      status: 503,
      expose: true,
    });
  }
  return new StubPaymentProvider();
}

export function getPaymentProvider(): PaymentProvider {
  if (!cached) cached = createPaymentProvider();
  return cached;
}

/** Test helper */
export function resetPaymentProviderCache(): void {
  cached = null;
}
