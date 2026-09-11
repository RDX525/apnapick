import { describe, expect, it } from "vitest";
import { hasPersistedListing, shouldAdvanceAfterSave } from "@/features/dashboard/section-nav";

describe("hasPersistedListing", () => {
  it("accepts a uuid listing id", () => {
    expect(hasPersistedListing("11111111-1111-1111-1111-111111111101")).toBe(true);
  });

  it("rejects empty or demo-style ids", () => {
    expect(hasPersistedListing("")).toBe(false);
    expect(hasPersistedListing("local-draft")).toBe(false);
  });
});

describe("shouldAdvanceAfterSave", () => {
  it("advances when nothing is pending", () => {
    expect(
      shouldAdvanceAfterSave({ dirty: false, saveSucceeded: false, hasListing: true }),
    ).toBe(true);
  });

  it("advances after a successful save", () => {
    expect(
      shouldAdvanceAfterSave({ dirty: true, saveSucceeded: true, hasListing: true }),
    ).toBe(true);
  });

  it("stays when a real listing failed to save", () => {
    expect(
      shouldAdvanceAfterSave({ dirty: true, saveSucceeded: false, hasListing: true }),
    ).toBe(false);
  });

  it("still advances a local draft so Next is not blocked by onboarding", () => {
    expect(
      shouldAdvanceAfterSave({ dirty: true, saveSucceeded: false, hasListing: false }),
    ).toBe(true);
  });
});
