import { describe, expect, it } from "vitest";
import {
  isBusinessOnboardingPath,
  isFocusedPath,
  isWorkspacePath,
} from "@/components/layout/site-chrome-paths";

describe("site chrome paths", () => {
  it("keeps List your business on the public site chrome", () => {
    expect(isBusinessOnboardingPath("/business/onboarding")).toBe(true);
    expect(isWorkspacePath("/business/onboarding")).toBe(false);
    expect(isFocusedPath("/business/onboarding")).toBe(false);
  });

  it("keeps the owner dashboard in the workspace chrome", () => {
    expect(isWorkspacePath("/business/dashboard")).toBe(true);
    expect(isFocusedPath("/business/dashboard")).toBe(true);
    expect(isWorkspacePath("/admin/businesses")).toBe(true);
  });

  it("keeps login without the public header", () => {
    expect(isFocusedPath("/login")).toBe(true);
    expect(isWorkspacePath("/login")).toBe(false);
  });
});
