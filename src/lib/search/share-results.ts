import { formatInrFromCents } from "@/lib/money/inr";

export type ShareableSearchResult = {
  name: string;
  priceCents?: number | null;
  avgRating: number;
};

function titleCaseItem(item: string): string {
  return item
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function lookingLine(item: string | null, query: string, place: string): string {
  if (item) {
    const food = /curry|biryani|pizza|chicken|pav|dosa|coffee|food/.test(
      item.toLowerCase(),
    );
    const prefix = food ? "🍗 " : "";
    return `${prefix}Looking for ${titleCaseItem(item)} in ${place}?`;
  }
  return `Looking for “${query}” in ${place}?`;
}

export function buildWhatsAppResultsMessage(input: {
  query: string;
  item: string | null;
  place: string;
  results: ShareableSearchResult[];
  url: string;
}): string {
  const lines = input.results.slice(0, 5).map((result) => {
    const price =
      result.priceCents != null ? ` — ${formatInrFromCents(result.priceCents)}` : "";
    const rating =
      result.avgRating > 0 ? ` — ${result.avgRating.toFixed(1)}★` : "";
    return `${result.name}${price}${rating}`;
  });

  return [
    lookingLine(input.item, input.query, input.place),
    "I found these top options.",
    "",
    ...lines,
    "",
    input.url,
  ].join("\n");
}

export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
