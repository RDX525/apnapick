import { describe, expect, it } from "vitest";
import {
  appendLocalAudit,
  applyAdminWorkspaceSnapshot,
  applyBusinessAction,
  applyClaimAction,
  applyUserAction,
  auditEntryFromAction,
  mergeAuditLogs,
  removeAdminContentItem,
} from "@/services/admin/actions";
import { createSeedAdminWorkspace } from "@/services/admin/workspace";

describe("admin claim actions", () => {
  it("approves with history and VERIFIED status", () => {
    const ws = createSeedAdminWorkspace();
    const claim = ws.claims[0]!;
    const updated = applyClaimAction(claim, "approve", "admin@localhost", "ok");
    expect(updated.status).toBe("VERIFIED");
    expect(updated.history.at(-1)).toMatchObject({
      action: "approve",
      by: "admin@localhost",
      note: "ok",
    });
  });

  it("request_more_info keeps under review", () => {
    const ws = createSeedAdminWorkspace();
    const updated = applyClaimAction(
      ws.claims[0]!,
      "request_more_info",
      "admin",
      "Need GST",
    );
    expect(updated.status).toBe("UNDER_REVIEW");
  });

  it("rejects and suspends map to REJECTED", () => {
    const ws = createSeedAdminWorkspace();
    expect(applyClaimAction(ws.claims[0]!, "reject", "a").status).toBe("REJECTED");
    expect(applyClaimAction(ws.claims[0]!, "suspend", "a").status).toBe("REJECTED");
  });
});

describe("admin business actions", () => {
  it("approves, suspends, and merges", () => {
    const ws = createSeedAdminWorkspace();
    const id = ws.businesses[0]!.id;
    const curry = ws.businesses.find((b) => b.slug === "curry-leaf-co")!;
    const dup = ws.businesses.find((b) => b.slug === "spice-route-kp")!;
    expect(applyBusinessAction(ws, id, "approve").businesses[0]!.status).toBe(
      "PUBLISHED",
    );
    expect(
      applyBusinessAction(ws, curry.id, "approve").businesses.find(
        (b) => b.id === curry.id,
      )!.ownerEditPending,
    ).toBe(false);
    expect(applyBusinessAction(ws, id, "suspend").businesses[0]!.status).toBe(
      "SUSPENDED",
    );
    const merged = applyBusinessAction(ws, dup.id, "merge_duplicate", id);
    expect(merged.businesses.find((b) => b.id === dup.id)!.status).toBe("MERGED");
  });

  it("accepts owner edits by publishing a pending listing", () => {
    const ws = createSeedAdminWorkspace();
    const pending = ws.businesses[0]!;
    expect(pending.status).toBe("PENDING_REVIEW");
    const next = applyBusinessAction(ws, pending.id, "edit");
    const updated = next.businesses.find((b) => b.id === pending.id)!;
    expect(updated.status).toBe("PUBLISHED");
    expect(updated.ownerEditPending).toBe(false);
  });

  it("accepts owner edits on a live listing without changing status", () => {
    const ws = createSeedAdminWorkspace();
    const live = ws.businesses.find((b) => b.slug === "curry-leaf-co")!;
    expect(live.status).toBe("PUBLISHED");
    expect(live.ownerEditPending).toBe(true);
    const next = applyBusinessAction(ws, live.id, "edit");
    const updated = next.businesses.find((b) => b.id === live.id)!;
    expect(updated.status).toBe("PUBLISHED");
    expect(updated.ownerEditPending).toBe(false);
  });
});

describe("admin user actions", () => {
  it("suspends and restores", () => {
    const ws = createSeedAdminWorkspace();
    const id = ws.users[0]!.id;
    const suspended = applyUserAction(ws, id, "suspend");
    expect(suspended.users[0]!.status).toBe("suspended");
    const restored = applyUserAction(suspended, id, "restore");
    expect(restored.users[0]!.status).toBe("active");
  });
});

describe("admin audit append", () => {
  it("prepends audit entries", () => {
    const ws = createSeedAdminWorkspace();
    const next = appendLocalAudit(ws, {
      id: "audit-1",
      action: "claim_approve",
      entityType: "business_claim",
      entityId: "x",
      actorEmail: "admin@localhost",
      createdAt: new Date().toISOString(),
    });
    expect(next.auditLogs[0]!.id).toBe("audit-1");
  });

  it("merges server logs with recent local entries", () => {
    const older = {
      id: "old",
      action: "claim_reject",
      entityType: "business_claim",
      entityId: "a",
      actorEmail: "ops@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const newer = {
      id: "new",
      action: "claim_approve",
      entityType: "business_claim",
      entityId: "b",
      actorEmail: "ops@example.com",
      createdAt: "2026-01-02T00:00:00.000Z",
    };
    expect(mergeAuditLogs([newer, older], [newer])).toEqual([newer, older]);
  });

  it("keeps optimistic logs while an action is in flight", () => {
    const previous = createSeedAdminWorkspace();
    const local = {
      id: "local-1",
      action: "category_activate",
      entityType: "category",
      entityId: "c1",
      actorEmail: "admin@example.com",
      createdAt: new Date().toISOString(),
    };
    previous.auditLogs = [local];
    const next = applyAdminWorkspaceSnapshot(
      previous,
      { auditLogs: [], claims: [] },
      { hasPendingActions: true },
    );
    expect(next.claims).toEqual(previous.claims);
    expect(next.auditLogs[0]!.id).toBe("local-1");
  });

  it("copies actor email from the server action result", () => {
    expect(
      auditEntryFromAction(
        {
          audit: {
            id: "audit-9",
            action: "claim_approve",
            createdAt: "2026-09-12T00:00:00.000Z",
            actorEmail: "admin@example.com",
          },
        },
        { action: "claim_approve", entityType: "business_claim", entityId: "c1" },
      ),
    ).toMatchObject({
      id: "audit-9",
      actorEmail: "admin@example.com",
    });
  });

  it("drops a photo from the workspace after a permanent delete", () => {
    const ws = createSeedAdminWorkspace();
    const photo = ws.content.find((item) => item.kind === "photo")!;
    const next = removeAdminContentItem(ws, photo.id);
    expect(next.content.some((item) => item.id === photo.id)).toBe(false);
    expect(next.content.length).toBe(ws.content.length - 1);
  });
});
