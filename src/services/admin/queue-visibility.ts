import type { BusinessStatus } from "@/domain/business/types";
import { isImportedCatalogListing } from "@/lib/business/imported-catalog";

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

/** Seed rows stay hidden. OSM catalog listings only appear when they need review. */
export function keepAdminBusinessRow(
  id: string,
  metadata: Record<string, unknown> | null | undefined,
  options: { includeOpenStreetMap: boolean },
): boolean {
  if (!id) return false;
  if (options.includeOpenStreetMap) {
    return !isImportedCatalogListing(id, null);
  }
  return !isImportedCatalogListing(id, metadata);
}

export function mergeAdminBusinessRows<T extends { id: unknown }>(
  reviewRows: T[],
  newestRows: T[],
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();
  for (const row of [...reviewRows, ...newestRows]) {
    const id = String(row.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(row);
  }
  return merged;
}

export function nextStatusForOwnerEditAction(current: BusinessStatus): BusinessStatus {
  return current === "PENDING_REVIEW" ? "PUBLISHED" : current;
}
