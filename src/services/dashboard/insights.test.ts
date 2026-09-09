import { describe, expect, it } from "vitest";
import { buildDashboardInsights, reorderById } from "@/services/dashboard/insights";
import { createSeedWorkspace } from "@/services/dashboard/workspace";

describe("dashboard insights", () => {
  it("suggests menu and photo improvements", () => {
    const ws = createSeedWorkspace();
    ws.menu = [];
    ws.photos = [];
    ws.products = [];
    ws.services = [];
    ws.metrics.searchAppearances = 124;

    const insights = buildDashboardInsights(ws);
    expect(insights.some((i) => i.id === "pending-review")).toBe(true);
    expect(insights.some((i) => i.title.includes("menu item"))).toBe(true);
    expect(insights.some((i) => i.title.includes("Add photos"))).toBe(true);
    expect(insights.some((i) => i.title.includes("124 searches"))).toBe(true);
  });

  it("reorders catalog items without dropping entries", () => {
    const items = [
      { id: "a", sortOrder: 0, name: "A" },
      { id: "b", sortOrder: 1, name: "B" },
      { id: "c", sortOrder: 2, name: "C" },
    ];
    const next = reorderById(items, "b", "up");
    expect(next.map((i) => i.id)).toEqual(["b", "a", "c"]);
    expect(next.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });
});
