import "server-only";

import { RazorpayPaymentProvider, hasRazorpayConfig } from "@/integrations/payments/razorpay-provider";
import { StubPaymentProvider } from "@/integrations/payments/stub-provider";
import type { PaymentProvider } from "@/integrations/payments/types";
import { BILLING_CHECKOUT_ENABLED } from "@/config/billing-plans";
import { AppError } from "@/lib/errors/app-error";

let cached: PaymentProvider | null = null;

export { hasRazorpayConfig };

/**
 * Prefer Razorpay when configured.
 * Paid checkout is currently off; production only requires Razorpay keys when
 * BILLING_CHECKOUT_ENABLED is true.
 */
export function createPaymentProvider(): PaymentProvider {
  if (hasRazorpayConfig()) return new RazorpayPaymentProvider();
  if (process.env.NODE_ENV === "production" && BILLING_CHECKOUT_ENABLED) {
    throw new AppError({
      message: "Razorpay is not configured",
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
