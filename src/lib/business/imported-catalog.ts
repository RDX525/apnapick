const SEED_BUSINESS_PREFIX = "11111111-1111-1111-1111-1111111111";

/** OSM bootstrap and local seed rows — not owner-created listings. */
export function isImportedCatalogListing(
  id: string | null | undefined,
  metadata?: Record<string, unknown> | null,
): boolean {
  const source = metadata?.source;
  if (typeof source === "string" && source.toLowerCase() === "openstreetmap") {
    return true;
  }
  if (id && id.toLowerCase().startsWith(SEED_BUSINESS_PREFIX)) return true;
  return false;
}
