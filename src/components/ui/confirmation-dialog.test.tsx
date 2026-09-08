// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

afterEach(cleanup);

describe("ConfirmationDialog", () => {
  it("keeps the dialog open and exposes failed actions", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Could not remove item"));
    render(
      <ConfirmationDialog
        title="Remove item?"
        description="This cannot be undone."
        confirmLabel="Remove"
        onConfirm={onConfirm}
        trigger={<Button>Open confirmation</Button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not remove item",
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes only after a successful action", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmationDialog
        title="Remove item?"
        description="This cannot be undone."
        confirmLabel="Remove"
        onConfirm={onConfirm}
        trigger={<Button>Open confirmation</Button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
