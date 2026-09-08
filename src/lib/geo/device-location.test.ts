import { describe, expect, it } from "vitest";
import {
  CURRENT_LOCATION_LABEL,
  CURRENT_LOCATION_VALUE,
  isCurrentLocationValue,
  locateFailureReasonFromCode,
} from "@/lib/geo/device-location";

describe("current location value", () => {
  it("identifies the current-location option", () => {
    expect(isCurrentLocationValue(CURRENT_LOCATION_VALUE)).toBe(true);
    expect(isCurrentLocationValue("pune")).toBe(false);
    expect(CURRENT_LOCATION_LABEL).toMatch(/current location/i);
  });

  it("maps geolocation error codes", () => {
    expect(locateFailureReasonFromCode(1)).toBe("denied");
    expect(locateFailureReasonFromCode(2)).toBe("unavailable");
    expect(locateFailureReasonFromCode(3)).toBe("unavailable");
    expect(locateFailureReasonFromCode()).toBe("unavailable");
  });
});
