import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RazorpayPaymentProvider } from "@/integrations/payments/razorpay-provider";

describe("RazorpayPaymentProvider webhooks", () => {
  beforeEach(() => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_123");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret_test");
  });

  it("rejects invalid signatures", async () => {
    const provider = new RazorpayPaymentProvider();
    await expect(
      provider.constructWebhookEvent("{}", "deadbeef", "evt_1"),
    ).rejects.toMatchObject({ code: "WEBHOOK_SIGNATURE_INVALID" });
  });

  it("parses a signed subscription.activated payload", async () => {
    const body = JSON.stringify({
      event: "subscription.activated",
      created_at: 1_700_000_000,
      payload: {
        subscription: {
          entity: {
            id: "sub_abc",
            status: "active",
            customer_id: "cust_1",
            plan_id: "plan_premium",
            current_start: 1_700_000_000,
            current_end: 1_702_592_000,
            notes: { business_id: "biz_1", plan_code: "premium" },
          },
        },
      },
    });
    const signature = createHmac("sha256", "whsec_test").update(body).digest("hex");
    const provider = new RazorpayPaymentProvider();
    const event = await provider.constructWebhookEvent(body, signature, "evt_abc");
    expect(event.id).toBe("evt_abc");
    expect(event.type).toBe("subscription.activated");
    expect(event.dataObject.id).toBe("sub_abc");
    expect(event.dataObject.customer).toBe("cust_1");
    expect(event.livemode).toBe(false);
  });
});
