import { describe, expect, it } from "vitest";
import { resolveLoginDestination } from "@/features/auth/auth-redirect";

describe("resolveLoginDestination", () => {
  it("sends admins to the admin console by default", () => {
    expect(resolveLoginDestination(null, ["USER", "ADMIN"])).toBe("/admin");
    expect(resolveLoginDestination(null, ["SUPER_ADMIN"])).toBe("/admin");
  });

  it("keeps an explicit safe destination", () => {
    expect(resolveLoginDestination("/business/onboarding", ["ADMIN"])).toBe(
      "/business/onboarding",
    );
  });

  it("sends non-admin users to the business dashboard", () => {
    expect(resolveLoginDestination(null, ["USER"])).toBe("/business/dashboard");
  });
});
