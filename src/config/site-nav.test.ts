import { describe, expect, it } from "vitest";
import { navLinkIsActive, PRIMARY_NAV } from "@/config/site-nav";

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
    expect(navLinkIsActive("/areas/baner", "/areas/pune")).toBe(true);
    expect(navLinkIsActive("/services/pune", "/services/pune")).toBe(true);
    expect(navLinkIsActive("/", "/search")).toBe(false);
  });
});
