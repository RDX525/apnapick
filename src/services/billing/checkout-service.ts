import "server-only";

import { getPublicEnv } from "@/config/env";
import { AppError } from "@/lib/errors/app-error";
import { getPaymentProvider } from "@/integrations/payments/get-payment-provider";
import type { PaidPlanCode } from "@/integrations/payments/types";
import {
  getActiveSubscription,
  getPlanByCode,
  resolvePriceId,
} from "@/services/billing/subscription-service";
import { isPlanCode } from "@/config/billing-plans";

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

  const priceId = resolvePriceId(plan);
  const provider = getPaymentProvider();

  if (provider.id === "stripe" && !priceId) {
    throw new AppError({
      message:
        "Stripe price is not configured for this plan (plans.external_price_id or STRIPE_PRICE_*)",
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
    successUrl: `${base}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
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
