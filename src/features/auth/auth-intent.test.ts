import { describe, expect, it } from "vitest";
import {
  isReviewerAuthIntent,
  reviewerReturnPath,
} from "@/features/auth/auth-intent";

describe("isReviewerAuthIntent", () => {
  it("detects intent=review", () => {
    expect(isReviewerAuthIntent({ intent: "review", next: null })).toBe(true);
  });

  it("detects return to a business listing", () => {
    expect(isReviewerAuthIntent({ next: "/b/spice-route-kitchen" })).toBe(true);
    expect(isReviewerAuthIntent({ next: "/b/spice-route-kitchen#reviews" })).toBe(
      true,
    );
  });

  it("does not treat owner destinations as reviewer intent", () => {
    expect(isReviewerAuthIntent({ next: "/business/onboarding" })).toBe(false);
    expect(isReviewerAuthIntent({ next: "/business/dashboard" })).toBe(false);
    expect(isReviewerAuthIntent({ next: null })).toBe(false);
  });
});

describe("reviewerReturnPath", () => {
  it("keeps a safe listing path", () => {
    expect(reviewerReturnPath("/b/spice-route-kitchen")).toBe(
      "/b/spice-route-kitchen",
    );
  });
});
