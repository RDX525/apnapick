import { describe, expect, it } from "vitest";
import {
  extraBusinessIdsForAdminLabels,
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
