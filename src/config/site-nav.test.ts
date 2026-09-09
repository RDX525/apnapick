import { describe, expect, it } from "vitest";
import { navLinkIsActive, PRIMARY_NAV, primaryNavForArea } from "@/config/site-nav";

describe("primary navigation", () => {
  it("covers discover, restaurants, services, and areas", () => {
    expect(PRIMARY_NAV.map((l) => l.label)).toEqual([
      "Discover",
      "Restaurants",
      "Services",
      "Areas",
    ]);
  });

  it("marks nested hub routes as active", () => {
    expect(navLinkIsActive("/restaurants/pune/indian", "/restaurants/pune")).toBe(true);
    expect(navLinkIsActive("/restaurants", "/restaurants/pune")).toBe(true);
    expect(navLinkIsActive("/areas/kharadi", "/areas/pune")).toBe(true);
    expect(navLinkIsActive("/services/pune", "/services/pune")).toBe(true);
    expect(navLinkIsActive("/", "/search")).toBe(false);
  });

  it("points hub links at the selected neighbourhood", () => {
    expect(primaryNavForArea("kharadi").map((l) => l.href)).toEqual([
      "/search",
      "/restaurants/kharadi",
      "/services/kharadi",
      "/areas/kharadi",
    ]);
    expect(primaryNavForArea("current").map((l) => l.href)).toEqual(
      PRIMARY_NAV.map((l) => l.href),
    );
  });
});
