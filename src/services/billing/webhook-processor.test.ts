import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const selectEq = vi.fn();
const updateEq = vi.fn();
const hasServiceRoleKey = vi.fn(() => true);

vi.mock("@/config/env", () => ({
  hasServiceRoleKey: () => hasServiceRoleKey(),
}));

vi.mock("@/lib/db/supabase-admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "subscription_events") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
              limit: () => ({ maybeSingle: async () => ({ data: null }) }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
          insert: async () => ({ data: null, error: null }),
        };
      }
      return {
        insert: insertMock,
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: selectEq,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: updateEq,
          }),
        }),
      };
    },
  }),
}));

import { processBillingWebhookEvent } from "@/services/billing/webhook-processor";
import { AppError } from "@/lib/errors/app-error";

function event(overrides?: Partial<{ id: string; type: string }>) {
  return {
    id: overrides?.id ?? "evt_1",
    type: overrides?.type ?? "unknown.event",
    dataObject: { id: "sub_1" },
    created: 1,
    livemode: false,
    raw: {},
  };
}

describe("processBillingWebhookEvent apply_status", () => {
  beforeEach(() => {
    insertMock.mockReset();
    selectEq.mockReset();
    updateEq.mockReset();
    hasServiceRoleKey.mockReturnValue(true);
    updateEq.mockResolvedValue({ error: null });
  });

  it("fails closed without a service role key", async () => {
    hasServiceRoleKey.mockReturnValue(false);
    await expect(processBillingWebhookEvent(event())).rejects.toMatchObject({
      code: "BILLING_NOT_CONFIGURED",
      status: 503,
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("acks duplicates only when already applied", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    });
    selectEq.mockResolvedValue({
      data: { apply_status: "applied", attempts: 1 },
      error: null,
    });

    const result = await processBillingWebhookEvent(event());
    expect(result).toMatchObject({
      duplicate: true,
      processed: true,
      eventId: "evt_1",
    });
  });

  it("retries apply when a duplicate is still pending", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    });
    selectEq.mockResolvedValue({
      data: { apply_status: "pending", attempts: 1 },
      error: null,
    });

    const result = await processBillingWebhookEvent(event({ type: "unknown.event" }));
    expect(result.duplicate).toBe(true);
    expect(result.processed).toBe(true);
    expect(updateEq).toHaveBeenCalled();
  });

  it("rethrows AppError as-is for missing service role", async () => {
    hasServiceRoleKey.mockReturnValue(false);
    try {
      await processBillingWebhookEvent(event());
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
    }
  });
});
