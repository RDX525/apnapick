import { describe, expect, it } from "vitest";
import {
  breadcrumbListJsonLd,
  organizationJsonLd,
  productJsonLd,
  serviceJsonLd,
} from "@/lib/seo/json-ld";

describe("seo json-ld", () => {
  it("builds Organization", () => {
    const org = organizationJsonLd();
    expect(org["@type"]).toBe("Organization");
    expect(org.areaServed).toMatchObject({ name: "Pune" });
  });

  it("builds BreadcrumbList positions", () => {
    const crumbs = breadcrumbListJsonLd([
      { name: "Home", path: "/" },
      { name: "Restaurants", path: "/restaurants" },
    ]);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement).toHaveLength(2);
    expect(crumbs.itemListElement[0]).toMatchObject({ position: 1 });
  });

  it("builds Product and Service nodes", () => {
    expect(
      productJsonLd({
        name: "Chicken curry",
        businessName: "Spice Route",
        businessPath: "/b/spice-route",
        priceCents: 25000,
      })["@type"],
    ).toBe("Product");
    expect(
      serviceJsonLd({
        name: "Plumbing",
        providerName: "TapFix",
        providerPath: "/b/tapfix",
        areaName: "Baner",
      })["@type"],
    ).toBe("Service");
  });
});
