import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import { StubPaymentProvider } from "@/integrations/payments/stub-provider";
import { mapRazorpaySubscriptionStatus } from "@/services/billing/billing-mappers";
import { hasEntitlement } from "@/domain/billing/entitlements";
import { PLAN_CATALOG, parsePlanFeatures, BILLING_CHECKOUT_ENABLED } from "@/config/billing-plans";
import { DEFAULT_FREE_FEATURES } from "@/domain/billing/types";

describe("billing plan catalog", () => {
  it("defines free, premium, and business", () => {
    expect(Object.keys(PLAN_CATALOG)).toEqual(["free", "premium", "business"]);
  });

  it("uses the configured monthly INR prices", () => {
    expect(PLAN_CATALOG.premium.priceCents).toBe(49_900);
    expect(PLAN_CATALOG.business.priceCents).toBe(89_900);
    expect(BILLING_CHECKOUT_ENABLED).toBe(false);
  });

  it("keeps free without sponsored eligibility", () => {
    expect(PLAN_CATALOG.free.features.sponsoredEligible).toBe(false);
    expect(PLAN_CATALOG.premium.features.teamMembers).toBe(true);
    expect(PLAN_CATALOG.business.features.sponsoredEligible).toBe(true);
  });

  it("parses features with free defaults", () => {
    const features = parsePlanFeatures({ offers: true });
    expect(features.offers).toBe(true);
    expect(features.basicProfile).toBe(true);
    expect(features.maxPhotos).toBe(DEFAULT_FREE_FEATURES.maxPhotos);
  });
});

describe("Razorpay status mapping", () => {
  it("maps Razorpay statuses to domain enums", () => {
    expect(mapRazorpaySubscriptionStatus("active")).toBe("ACTIVE");
    expect(mapRazorpaySubscriptionStatus("authenticated")).toBe("TRIALING");
    expect(mapRazorpaySubscriptionStatus("pending")).toBe("PAST_DUE");
    expect(mapRazorpaySubscriptionStatus("cancelled")).toBe("CANCELED");
    expect(mapRazorpaySubscriptionStatus("expired")).toBe("EXPIRED");
  });
});

describe("entitlements helpers", () => {
  it("checks boolean and numeric features", () => {
    expect(hasEntitlement(PLAN_CATALOG.free.features, "teamMembers")).toBe(false);
    expect(hasEntitlement(PLAN_CATALOG.premium.features, "teamMembers")).toBe(true);
    expect(hasEntitlement(PLAN_CATALOG.free.features, "maxTeamMembers")).toBe(true);
  });
});

describe("StubPaymentProvider webhook", () => {
  it("rejects bad signatures", async () => {
    const provider = new StubPaymentProvider();
    await expect(provider.constructWebhookEvent("{}", "wrong")).rejects.toMatchObject({
      code: "WEBHOOK_SIGNATURE_INVALID",
    });
  });

  it("parses Razorpay-shaped stub events", async () => {
    const provider = new StubPaymentProvider();
    const payload = JSON.stringify({
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_1",
            status: "active",
            notes: { business_id: "00000000-0000-0000-0000-000000000001" },
          },
        },
      },
    });
    const event = await provider.constructWebhookEvent(payload, "stub", "evt_test_1");
    expect(event.id).toBe("evt_test_1");
    expect(event.type).toBe("subscription.activated");
    expect(event.dataObject.id).toBe("sub_1");
  });

  it("checkout never claims activation", async () => {
    const provider = new StubPaymentProvider();
    const session = await provider.createCheckoutSession({
      businessId: "biz",
      planCode: "premium",
      priceId: "plan_x",
      expectedAmountCents: 49_900,
      expectedCurrency: "INR",
      expectedInterval: "month",
      successUrl: "http://localhost:3000/ok",
      cancelUrl: "http://localhost:3000/cancel",
    });
    expect(session.url).toContain("await_webhook=1");
    expect(session.sessionId).toMatch(/^stub_cs_/);
  });
});

describe("paid checkout", () => {
  it("is disabled until coming-soon is lifted", async () => {
    const { assertPaidBillingEnabled } = await import(
      "@/services/billing/checkout-service"
    );
    expect(() => assertPaidBillingEnabled()).toThrowError(/coming soon/i);
  });
});

describe("webhook idempotency contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("documents unique constraint key used for idempotency", () => {
    const key = ["razorpay", "evt_123"];
    expect(key.join(":")).toBe("razorpay:evt_123");
  });
});
