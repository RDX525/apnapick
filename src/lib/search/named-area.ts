/** Wide enough to retrieve a named-area listing whose pin is closer to Pune CBD. */
export const NAMED_AREA_RETRIEVE_RADIUS_M = 25_000;

/** Suburb/city text match for queries like "in Wagholi". */
export function listingMatchesNamedArea(
  suburb: string | null | undefined,
  city: string | null | undefined,
  areaSlug: string | null | undefined,
): boolean {
  if (!areaSlug || areaSlug === "pune") return false;
  const area = areaSlug.replace(/-/g, " ");
  return `${suburb ?? ""} ${city ?? ""}`.toLowerCase().includes(area);
}
