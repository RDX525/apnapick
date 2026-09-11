import type { BusinessStatus } from "@/domain/business/types";

/**
 * Owner-created listings stay on the Businesses page.
 * Claims and reports must still include OSM/catalog listings — that is
 * the "Claim this business" product path.
 */
export function extraBusinessIdsForAdminLabels(
  knownIds: Iterable<string>,
  claimBusinessIds: Iterable<string>,
  reportBusinessTargetIds: Iterable<string>,
): string[] {
  const known = new Set(
    [...knownIds].filter((id) => id.length > 0),
  );
  const extra = new Set<string>();
  for (const id of claimBusinessIds) {
    if (id && !known.has(id)) extra.add(id);
  }
  for (const id of reportBusinessTargetIds) {
    if (id && !known.has(id)) extra.add(id);
  }
  return [...extra];
}

export function nextStatusForOwnerEditAction(current: BusinessStatus): BusinessStatus {
  return current === "PENDING_REVIEW" ? "PUBLISHED" : current;
}
