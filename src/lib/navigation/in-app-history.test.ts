// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  hasInAppHistory,
  isRoutePop,
  markInAppPop,
  readInAppNavCount,
  recordInAppPath,
  seedInAppPath,
} from "@/lib/navigation/in-app-history";

describe("in-app history", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("starts with no in-app history so Back will not leave the site", () => {
    seedInAppPath("/restaurants/pune");
    expect(readInAppNavCount()).toBe(0);
    expect(hasInAppHistory()).toBe(false);
  });

  it("counts forward client navigations after the first page", () => {
    seedInAppPath("/");
    recordInAppPath("/search");
    expect(hasInAppHistory()).toBe(true);
    recordInAppPath("/b/spice-route");
    expect(readInAppNavCount()).toBe(2);
  });

  it("pops on back so a second Back uses the fallback href instead of leaving the site", () => {
    seedInAppPath("/restaurants/pune");
    recordInAppPath("/b/spice-route");
    expect(hasInAppHistory()).toBe(true);

    markInAppPop();
    recordInAppPath("/restaurants/pune");
    expect(hasInAppHistory()).toBe(false);
  });

  it("restores the tracked hop when the browser moves forward", () => {
    seedInAppPath("/");
    recordInAppPath("/search");
    markInAppPop();
    recordInAppPath("/");
    expect(hasInAppHistory()).toBe(false);

    markInAppPop();
    recordInAppPath("/search");
    expect(hasInAppHistory()).toBe(true);
  });

  it("does not treat same-path updates as a new hop", () => {
    seedInAppPath("/search");
    recordInAppPath("/search");
    expect(readInAppNavCount()).toBe(0);
  });

  it("ignores same-URL history entries used to dismiss overlays", () => {
    expect(isRoutePop("/search", "/search")).toBe(false);
    expect(isRoutePop("/search", "/")).toBe(true);
  });
});
