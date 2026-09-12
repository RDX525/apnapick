import { describe, expect, it } from "vitest";
import { navLinkIsActive, PRIMARY_NAV, primaryNavForArea } from "@/config/site-nav";

describe("primary navigation", () => {
  it("covers discover, food, beauty, and areas from the live site", () => {
    expect(PRIMARY_NAV.map((l) => l.label)).toEqual([
      "Discover",
      "Food & Dining",
      "Beauty",
      "Areas",
    ]);
    expect(PRIMARY_NAV.map((l) => l.href)).toEqual([
      "/search",
      "/food-dining/pune",
      "/beauty-personal-care/pune",
      "/areas/pune",
    ]);
  });

  it("marks nested hub routes as active", () => {
    expect(navLinkIsActive("/food-dining/pune/indian", "/food-dining/pune")).toBe(true);
    expect(navLinkIsActive("/food-dining", "/food-dining/pune")).toBe(true);
    expect(navLinkIsActive("/beauty-personal-care/kharadi", "/beauty-personal-care/pune")).toBe(
      true,
    );
    expect(navLinkIsActive("/areas/kharadi", "/areas/pune")).toBe(true);
    expect(navLinkIsActive("/", "/search")).toBe(false);
  });

  it("points hub links at the selected neighbourhood", () => {
    expect(primaryNavForArea("kharadi").map((l) => l.href)).toEqual([
      "/search",
      "/food-dining/kharadi",
      "/beauty-personal-care/kharadi",
      "/areas/kharadi",
    ]);
    expect(primaryNavForArea("current").map((l) => l.href)).toEqual(
      PRIMARY_NAV.map((l) => l.href),
    );
  });
});
