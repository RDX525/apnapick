import { describe, expect, it } from "vitest";
import { mapsDirectionsUrl } from "@/lib/geo/directions";

describe("mapsDirectionsUrl", () => {
  it("includes a destination and optional origin", () => {
    const url = new URL(
      mapsDirectionsUrl({
        destination: { lat: 18.5362, lng: 73.8939 },
        destinationLabel: "German Bakery",
        origin: { lat: 18.5204, lng: 73.8567 },
      }),
    );

    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("destination")).toBe("German Bakery@18.5362,73.8939");
    expect(url.searchParams.get("origin")).toBe("18.5204,73.8567");
  });
});
