import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateAfterAuth, resolveOwnerHome } from "@/features/auth/auth-redirect";

describe("resolveOwnerHome", () => {
  it("sends admins to the admin console by default", () => {
    expect(
      resolveOwnerHome({ requestedNext: null, roles: ["USER", "ADMIN"], hasListing: true }),
    ).toBe("/admin");
    expect(
      resolveOwnerHome({ requestedNext: null, roles: ["SUPER_ADMIN"], hasListing: false }),
    ).toBe("/admin");
  });

  it("keeps an explicit onboarding destination", () => {
    expect(
      resolveOwnerHome({
        requestedNext: "/business/onboarding",
        roles: ["ADMIN"],
        hasListing: true,
      }),
    ).toBe("/business/onboarding");
  });

  it("sends owners with a listing to the dashboard", () => {
    expect(
      resolveOwnerHome({ requestedNext: null, roles: ["USER"], hasListing: true }),
    ).toBe("/business/dashboard");
  });

  it("sends new owners to list their business first", () => {
    expect(
      resolveOwnerHome({ requestedNext: null, roles: ["USER"], hasListing: false }),
    ).toBe("/business/onboarding");
    expect(
      resolveOwnerHome({
        requestedNext: "/business/dashboard",
        roles: ["USER"],
        hasListing: false,
      }),
    ).toBe("/business/onboarding");
  });
});

describe("navigateAfterAuth", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the destination as a full document navigation", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    navigateAfterAuth("/business/dashboard");
    expect(assign).toHaveBeenCalledWith("/business/dashboard");
  });
});
