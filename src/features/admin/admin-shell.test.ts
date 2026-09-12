import { describe, expect, it } from "vitest";
import { ADMIN_NAV, ADMIN_PAGE_COPY, adminPageCopy } from "@/features/admin/admin-shell";

describe("admin page copy", () => {
  it("covers every sidebar route", () => {
    for (const item of ADMIN_NAV) {
      expect(ADMIN_PAGE_COPY[item.href], item.href).toMatchObject({
        title: item.label,
      });
    }
  });

  it("falls back for unknown paths", () => {
    expect(adminPageCopy("/admin/not-a-page")).toEqual({
      title: "Admin",
      description: undefined,
    });
  });
});
