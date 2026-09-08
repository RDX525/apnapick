// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  it("exposes its current value to assistive technology", () => {
    render(<Progress value={42} aria-label="Profile completeness" />);

    expect(
      screen
        .getByRole("progressbar", { name: "Profile completeness" })
        .getAttribute("aria-valuenow"),
    ).toBe("42");
  });
});
