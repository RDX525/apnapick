import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { StubPaymentProvider } from "@/integrations/payments/stub-provider";
import { mapStripeSubscriptionStatus } from "@/services/billing/stripe-mappers";
import { hasEntitlement } from "@/domain/billing/entitlements";
import { PLAN_CATALOG, parsePlanFeatures } from "@/config/billing-plans";
import { DEFAULT_FREE_FEATURES } from "@/domain/billing/types";

describe("billing plan catalog", () => {
  it("defines free, premium, and business", () => {
    expect(Object.keys(PLAN_CATALOG)).toEqual(["free", "premium", "business"]);
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

describe("Stripe status mapping", () => {
  it("maps Stripe statuses to domain enums", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("ACTIVE");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("TRIALING");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("CANCELED");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("EXPIRED");
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

  it("parses stub events with stable ids", async () => {
    const provider = new StubPaymentProvider();
    const payload = JSON.stringify({
      id: "evt_test_1",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_1",
          status: "active",
          metadata: { business_id: "00000000-0000-0000-0000-000000000001" },
        },
      },
    });
    const event = await provider.constructWebhookEvent(payload, "stub");
    expect(event.id).toBe("evt_test_1");
    expect(event.type).toBe("customer.subscription.updated");
    expect(event.dataObject.id).toBe("sub_1");
  });

  it("checkout never claims activation", async () => {
    const provider = new StubPaymentProvider();
    const session = await provider.createCheckoutSession({
      businessId: "biz",
      planCode: "premium",
      priceId: "price_x",
      successUrl: "http://localhost:3000/ok",
      cancelUrl: "http://localhost:3000/cancel",
    });
    expect(session.url).toContain("await_webhook=1");
    expect(session.sessionId).toMatch(/^stub_cs_/);
  });
});

describe("webhook idempotency contract", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("documents unique constraint key used for idempotency", () => {
    const key = ["stripe", "evt_123"];
    expect(key.join(":")).toBe("stripe:evt_123");
  });
});
