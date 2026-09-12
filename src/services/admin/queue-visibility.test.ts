import { describe, expect, it } from "vitest";
import {
  extraBusinessIdsForAdminLabels,
  keepAdminBusinessRow,
  mergeAdminBusinessRows,
  nextStatusForOwnerEditAction,
} from "@/services/admin/queue-visibility";

describe("extraBusinessIdsForAdminLabels", () => {
  it("keeps OSM and other catalog ids that are missing from the owner-created set", () => {
    const ownerCreated = ["owner-1"];
    const extra = extraBusinessIdsForAdminLabels(
      ownerCreated,
      ["owner-1", "osm-claim"],
      ["owner-1", "osm-report"],
    );
    expect(extra.sort()).toEqual(["osm-claim", "osm-report"]);
  });

  it("returns nothing when claims and reports already have names", () => {
    expect(
      extraBusinessIdsForAdminLabels(["a", "b"], ["a"], ["b"]),
    ).toEqual([]);
  });
});

describe("keepAdminBusinessRow", () => {
  it("hides OSM catalog listings from the general businesses list", () => {
    expect(
      keepAdminBusinessRow(
        "99548baa-4a09-5aef-ad02-a9741936c1fc",
        { source: "openstreetmap" },
        { includeOpenStreetMap: false },
      ),
    ).toBe(false);
  });

  it("keeps OSM listings that are waiting for owner-edit review", () => {
    expect(
      keepAdminBusinessRow(
        "99548baa-4a09-5aef-ad02-a9741936c1fc",
        { source: "openstreetmap" },
        { includeOpenStreetMap: true },
      ),
    ).toBe(true);
  });

  it("always hides local seed listings", () => {
    expect(
      keepAdminBusinessRow("11111111-1111-1111-1111-111111111101", null, {
        includeOpenStreetMap: true,
      }),
    ).toBe(false);
  });
});

describe("mergeAdminBusinessRows", () => {
  it("puts review-queue listings first and drops duplicates", () => {
    expect(
      mergeAdminBusinessRows(
        [{ id: "pending" }, { id: "shared" }],
        [{ id: "shared" }, { id: "newest" }],
      ),
    ).toEqual([{ id: "pending" }, { id: "shared" }, { id: "newest" }]);
  });
});

describe("nextStatusForOwnerEditAction", () => {
  it("publishes listings waiting for review", () => {
    expect(nextStatusForOwnerEditAction("PENDING_REVIEW")).toBe("PUBLISHED");
  });

  it("leaves already-decided statuses alone", () => {
    expect(nextStatusForOwnerEditAction("PUBLISHED")).toBe("PUBLISHED");
    expect(nextStatusForOwnerEditAction("DRAFT")).toBe("DRAFT");
    expect(nextStatusForOwnerEditAction("REJECTED")).toBe("REJECTED");
  });
});
