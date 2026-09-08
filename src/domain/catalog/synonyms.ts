/**
 * Synonym expansions for dishes, services, and tags.
 * Used by SearchParser (query understanding) and retrieval query building.
 * Keep keys lowercase; values are alternate match terms.
 */
export const ITEM_SYNONYMS: Record<string, string[]> = {
  "chicken curry": ["murgh curry", "chicken gravy", "chicken masala"],
  biryani: ["dum biryani", "hyderabadi biryani"],
  "misal pav": ["misal"],
  "vada pav": ["wada pav"],
  pizza: ["wood fired pizza", "thin crust pizza"],
  "filter coffee": ["south indian coffee", "kaapi"],
  "skin fade": ["fade", "low fade", "mid fade"],
  fade: ["skin fade", "taper fade"],
  "leaking tap": ["tap leak", "faucet leak", "dripping tap"],
  plumber: ["plumbing"],
};

export const TAG_SYNONYMS: Record<string, string[]> = {
  vegetarian: ["veg", "pure veg"],
  "open now": ["currently open", "open tonight"],
};

/** Expand a phrase into itself plus known synonyms (deduped). */
export function expandSynonyms(term: string): string[] {
  const key = term.toLowerCase().trim();
  if (!key) return [];
  const extras = ITEM_SYNONYMS[key] ?? [];
  const out = new Set<string>([key, ...extras.map((e) => e.toLowerCase())]);
  // Also match if term contains a synonym key
  for (const [canonical, alts] of Object.entries(ITEM_SYNONYMS)) {
    if (key.includes(canonical) || alts.some((a) => key.includes(a))) {
      out.add(canonical);
      for (const a of alts) out.add(a);
    }
  }
  return [...out];
}
