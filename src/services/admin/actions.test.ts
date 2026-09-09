import { describe, expect, it } from "vitest";
import {
  appendLocalAudit,
  applyBusinessAction,
  applyClaimAction,
  applyUserAction,
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
});
