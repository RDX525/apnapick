import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("@/lib/db/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: () => ({ insert: mocks.insert }),
  })),
}));

import { writeAdminAudit } from "@/services/admin/audit";

const input = {
  actor: {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "admin@example.com",
    displayName: "Admin",
    roles: ["SUPER_ADMIN" as const],
  },
  action: "category_activate",
  entityType: "category",
  entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

describe("writeAdminAudit", () => {
  beforeEach(() => {
    mocks.insert.mockReset();
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("returns the persisted audit record", async () => {
    const record = await writeAdminAudit(input);

    expect(record).toMatchObject({
      actorId: input.actor.id,
      action: input.action,
      entityId: input.entityId,
    });
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("propagates database write failures", async () => {
    mocks.insert.mockResolvedValue({ error: new Error("audit insert failed") });

    await expect(writeAdminAudit(input)).rejects.toThrow("audit insert failed");
  });
});
