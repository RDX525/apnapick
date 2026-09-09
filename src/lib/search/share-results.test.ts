import { describe, expect, it } from "vitest";
import {
  buildWhatsAppResultsMessage,
  whatsappShareHref,
} from "@/lib/search/share-results";

describe("WhatsApp result share", () => {
  it("builds a forwardable results message", () => {
    const text = buildWhatsAppResultsMessage({
      query: "Best Chicken Curry in Baner",
      item: "chicken curry",
      place: "Baner",
      url: "https://apnapick.com/search?q=Best+Chicken+Curry+in+Baner",
      results: [
        { name: "Spice Route Kitchen", priceCents: 24900, avgRating: 4.7 },
        { name: "Baner Cloud Kitchen", priceCents: 22000, avgRating: 4.6 },
      ],
    });
    expect(text).toContain("Looking for Chicken Curry in Baner?");
    expect(text).toContain("I found these top options.");
    expect(text).toContain("Spice Route Kitchen — ₹249 — 4.7★");
    expect(text).toContain("https://apnapick.com/search?q=Best+Chicken+Curry+in+Baner");
    expect(whatsappShareHref(text)).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });
});
