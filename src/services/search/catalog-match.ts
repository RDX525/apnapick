export type PricedCatalogItem = {
  name: string;
  priceCents: number | null;
};

export function tokenOverlap(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase().trim();
  if (!n) return 0;
  if (h.includes(n)) return 1;
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 0;
  const hits = parts.filter((p) => h.includes(p)).length;
  return hits / parts.length;
}

/**
 * Pick the catalog row that best matches the query terms.
 * When a rupee cap is set, prefer a matching item at or under budget.
 */
export function pickMatchedCatalogItem(
  items: PricedCatalogItem[],
  terms: string[],
  maxPriceCents?: number | null,
): PricedCatalogItem | null {
  if (items.length === 0) return null;
  const needles = terms.map((t) => t.trim()).filter(Boolean);
  const scored = items
    .map((item) => ({
      item,
      score: needles.length
        ? Math.max(...needles.map((term) => tokenOverlap(item.name, term)))
        : 0,
    }))
    .filter((row) => row.score >= 0.35)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.item.priceCents ?? Infinity) - (b.item.priceCents ?? Infinity);
    });

  if (scored.length === 0) return null;

  if (maxPriceCents != null) {
    const under = scored.filter(
      (row) =>
        row.item.priceCents == null || row.item.priceCents <= maxPriceCents,
    );
    if (under[0]) return under[0].item;
  }

  return scored[0]?.item ?? null;
}
