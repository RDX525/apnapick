import "server-only";

import { getPublicEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { getPaymentProvider } from "@/integrations/payments/get-payment-provider";
import type { PaidPlanCode } from "@/integrations/payments/types";
import {
  getActiveSubscription,
  getPlanByCode,
  resolveExternalPlanId,
} from "@/services/billing/subscription-service";
import { isPlanCode, BILLING_CHECKOUT_ENABLED } from "@/config/billing-plans";

export function assertPaidBillingEnabled() {
  if (BILLING_CHECKOUT_ENABLED) return;
  throw new AppError({
    message: "Paid plans are coming soon.",
    code: "BILLING_COMING_SOON",
    status: 503,
    expose: true,
  });
}

/**
 * Start Checkout. Client must redirect to returned URL.
 * Never treat redirect-back as payment success — webhooks are source of truth.
 */
export async function createCheckoutForBusiness(input: {
  businessId: string;
  planCode: string;
  customerEmail?: string | null;
  successPath?: string;
  cancelPath?: string;
}) {
  assertPaidBillingEnabled();
  if (!isPlanCode(input.planCode) || input.planCode === "free") {
    throw new AppError({
      message: "Select Premium or Business to checkout",
      code: "INVALID_PLAN",
      status: 400,
      expose: true,
    });
  }

  const plan = await getPlanByCode(input.planCode);
  if (!plan) {
    throw new AppError({
      message: "Plan not found",
      code: "PLAN_NOT_FOUND",
      status: 404,
      expose: true,
    });
  }

  const priceId = resolveExternalPlanId(plan);
  const provider = getPaymentProvider();

  if (provider.id === "razorpay" && !priceId) {
    throw new AppError({
      message:
        "Razorpay plan is not configured for this listing plan (plans.external_price_id or RAZORPAY_PLAN_*)",
      code: "BILLING_PRICE_MISSING",
      status: 503,
      expose: true,
    });
  }

  const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const successPath =
    input.successPath ??
    `/business/dashboard/subscription?checkout=return&plan=${plan.code}`;
  const cancelPath =
    input.cancelPath ??
    `/business/dashboard/subscription?checkout=canceled&plan=${plan.code}`;

  const existing = await getActiveSubscription(input.businessId);

  const session = await provider.createCheckoutSession({
    businessId: input.businessId,
    planCode: plan.code as PaidPlanCode,
    priceId: priceId ?? `price_stub_${plan.code}`,
    expectedAmountCents: plan.priceCents,
    expectedCurrency: plan.currency,
    expectedInterval: plan.interval,
    customerEmail: input.customerEmail,
    externalCustomerId: existing?.externalCustomerId,
    successUrl: `${base}${successPath}`,
    cancelUrl: `${base}${cancelPath}`,
    metadata: { business_id: input.businessId, plan_code: plan.code },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.sessionId,
    provider: session.provider,
    /** Explicit: client must not flip subscription state from this response */
    activationSource: "webhook" as const,
  };
}

export async function createBillingPortalForBusiness(input: {
  businessId: string;
  returnPath?: string;
}) {
  assertPaidBillingEnabled();
  const sub = await getActiveSubscription(input.businessId);
  if (!sub?.externalCustomerId) {
    throw new AppError({
      message: "No billing customer on file yet",
      code: "BILLING_CUSTOMER_MISSING",
      status: 400,
      expose: true,
    });
  }

  const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const returnPath = input.returnPath ?? "/business/dashboard/subscription";
  const provider = getPaymentProvider();
  const portal = await provider.createBillingPortalSession({
    externalCustomerId: sub.externalCustomerId,
    returnUrl: `${base}${returnPath}`,
  });
  return { portalUrl: portal.url, provider: provider.id };
}
