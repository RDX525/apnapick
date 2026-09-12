import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  createAdminDataClient: vi.fn(async () => null),
}));

vi.mock("@/lib/db/supabase-admin", () => ({
  createAdminDataClient: mocks.createAdminDataClient,
}));

vi.mock("@/lib/db/supabase-server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: () => ({ insert: mocks.insert }),
  })),
}));

import { actorEmailFromAuditRow, writeAdminAudit } from "@/services/admin/audit";

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
    mocks.createAdminDataClient.mockReset();
    mocks.createAdminDataClient.mockResolvedValue(null);
  });

  it("returns the persisted audit record", async () => {
    const record = await writeAdminAudit(input);

    expect(record).toMatchObject({
      actorId: input.actor.id,
      action: input.action,
      entityId: input.entityId,
      actorEmail: input.actor.email,
    });
    expect(record.newData).toMatchObject({ actorEmail: input.actor.email });
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("propagates database write failures", async () => {
    mocks.insert.mockResolvedValue({ error: new Error("audit insert failed") });

    await expect(writeAdminAudit(input)).rejects.toThrow("audit insert failed");
  });

  it("prefers the admin data client when it is available", async () => {
    const adminInsert = vi.fn().mockResolvedValue({ error: null });
    mocks.createAdminDataClient.mockResolvedValue({
      supabase: { from: () => ({ insert: adminInsert }) },
      canManageAuthUsers: true,
    });

    await writeAdminAudit(input);

    expect(adminInsert).toHaveBeenCalledOnce();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("actorEmailFromAuditRow", () => {
  it("uses the auth email map first, then new_data.actorEmail", () => {
    const emails = new Map([["actor-1", "ops@example.com"]]);
    expect(actorEmailFromAuditRow("actor-1", emails, { actorEmail: "other@example.com" })).toBe(
      "ops@example.com",
    );
    expect(
      actorEmailFromAuditRow("missing", emails, { actorEmail: "stored@example.com" }),
    ).toBe("stored@example.com");
    expect(actorEmailFromAuditRow(null, emails, { status: "PUBLISHED" })).toBeNull();
  });
});
