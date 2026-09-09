import {
  ATTRIBUTE_ALIASES,
  PUNE_AREAS,
  CATEGORY_LEXICON,
  CLOTHING_ITEM_PATTERN,
  CUISINE_FACETS,
  NEAR_ME_PHRASES,
  OPEN_NOW_PHRASES,
  PRICE_WORDS,
  QUALITY_WORDS,
  STOPWORDS,
} from "@/domain/catalog/lexicon";
import { rupeesToCents } from "@/lib/money/inr";
import { expandSynonyms } from "@/domain/catalog/synonyms";
import type {
  ParsedSearchQuery,
  PricePreference,
  SearchIntent,
  SearchIntentSummary,
} from "@/domain/search/types";

function normalize(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_PRICE_RE =
  /\b(?:under|below|upto|up\s*to|less\s*than)\s*(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})*|\d{2,6})\b/i;

function extractMaxPrice(
  raw: string,
  text: string,
): { text: string; maxPriceCents: number | null } {
  const match = raw.match(MAX_PRICE_RE) ?? text.match(MAX_PRICE_RE);
  const amount = match?.[1]?.replace(/,/g, "");
  if (!amount) return { text, maxPriceCents: null };
  const rupees = Number(amount);
  if (!Number.isFinite(rupees) || rupees < 10 || rupees > 1_000_000) {
    return { text, maxPriceCents: null };
  }
  const stripped = text
    .replace(
      /\b(?:under|below|upto|up\s+to|less\s+than)\s+(?:rs|inr)?\s*\d+(?:\s+\d{3})*\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return { text: stripped, maxPriceCents: rupeesToCents(rupees) };
}

function takePhrase(
  text: string,
  phrases: readonly string[],
): { text: string; matched: boolean; phrase?: string } {
  for (const phrase of phrases) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (re.test(text)) {
      return {
        text: text.replace(re, " ").replace(/\s+/g, " ").trim(),
        matched: true,
        phrase,
      };
    }
  }
  return { text, matched: false };
}

function extractArea(text: string): {
  text: string;
  areaSlug?: string;
  label?: string;
} {
  const inMatch = text.match(/\bin\s+([a-z0-9\s-]+)$/i);
  const candidate = inMatch?.[1]?.trim() ?? text;

  for (const [slug, meta] of Object.entries(PUNE_AREAS)) {
    for (const alias of meta.aliases) {
      const re = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (re.test(candidate) || re.test(text)) {
        let next = text.replace(re, " ");
        next = next
          .replace(/\bin\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
        return { text: next, areaSlug: slug, label: meta.label };
      }
    }
  }
  return { text };
}

function extractCategories(text: string): {
  text: string;
  categorySlugs: string[];
  serviceTerms: string[];
} {
  const categorySlugs: string[] = [];
  const serviceTerms: string[] = [];
  let next = text;

  const sorted = [...CATEGORY_LEXICON].sort(
    (a, b) =>
      Math.max(...b.aliases.map((x) => x.length)) -
      Math.max(...a.aliases.map((x) => x.length)),
  );

  for (const entry of sorted) {
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (re.test(next)) {
        if (!categorySlugs.includes(entry.slug)) {
          categorySlugs.push(entry.slug);
        }
        if (
          entry.kind === "service" ||
          (entry.slug === "barbers" &&
            ["haircut", "fade", "hair"].includes(alias))
        ) {
          serviceTerms.push(alias);
        }
        next = next.replace(re, " ").replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  return { text: next, categorySlugs, serviceTerms };
}

function extractAttributes(text: string): { text: string; attributes: string[] } {
  const attributes: string[] = [];
  let next = text;

  for (const [attr, aliases] of Object.entries(ATTRIBUTE_ALIASES)) {
    for (const alias of [...aliases].sort((a, b) => b.length - a.length)) {
      const re = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (re.test(next)) {
        if (!attributes.includes(attr)) attributes.push(attr);
        next = next.replace(re, " ").replace(/\s+/g, " ").trim();
      }
    }
  }

  for (const [facet, aliases] of Object.entries(CUISINE_FACETS)) {
    for (const alias of [...aliases].sort((a, b) => b.length - a.length)) {
      const re = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (re.test(next)) {
        if (!attributes.includes(facet)) attributes.push(facet);
        const cuisineLabels = new Set([
          "north indian",
          "south indian",
          "maharashtrian",
          "punjabi",
          "mughlai",
          "chinese",
          "indo chinese",
          "italian",
          "biryani",
        ]);
        if (cuisineLabels.has(alias)) {
          next = next.replace(re, " ").replace(/\s+/g, " ").trim();
        }
      }
    }
  }

  return { text: next, attributes };
}

function extractPrice(text: string): {
  text: string;
  pricePreference: PricePreference | null;
} {
  let next = text;
  for (const [pref, words] of Object.entries(PRICE_WORDS) as [
    PricePreference,
    string[],
  ][]) {
    for (const word of words) {
      const re = new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`, "i");
      if (re.test(next)) {
        next = next.replace(re, " ").replace(/\s+/g, " ").trim();
        return { text: next, pricePreference: pref };
      }
    }
  }
  return { text: next, pricePreference: null };
}

function extractQuality(text: string): {
  text: string;
  qualityPreference: "best" | null;
} {
  let next = text;
  for (const word of QUALITY_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(next)) {
      next = next.replace(re, " ").replace(/\s+/g, " ").trim();
      return { text: next, qualityPreference: "best" };
    }
  }
  return { text: next, qualityPreference: null };
}

function inferIntent(input: {
  categorySlugs: string[];
  itemTerms: string[];
  serviceTerms: string[];
  remaining: string;
}): SearchIntent {
  if (input.serviceTerms.length > 0 || input.categorySlugs.includes("plumbers")) {
    return "service";
  }
  if (
    input.categorySlugs.length > 0 ||
    input.itemTerms.length > 0 ||
    input.remaining.length > 0
  ) {
    return "discovery";
  }
  if (input.remaining.split(" ").length <= 3 && input.categorySlugs.length === 0) {
    return "business_name";
  }
  return "unknown";
}

function categoryToSingular(slug: string | undefined): string | null {
  if (!slug) return null;
  const map: Record<string, string> = {
    restaurants: "restaurant",
    cafes: "cafe",
    bars: "bar",
    barbers: "barber",
    plumbers: "plumber",
    electricians: "electrician",
    dentists: "dentist",
    gyms: "gym",
    "clothing-fashion": "clothing",
    "food-dining": "food",
    "beauty-personal-care": "beauty",
    "shopping-retail": "shop",
  };
  return map[slug] ?? slug.replace(/s$/, "");
}

export class SearchParser {
  parse(rawQuery: string): ParsedSearchQuery {
    const raw = rawQuery.trim();
    let text = normalize(raw);

    const near = takePhrase(text, NEAR_ME_PHRASES);
    text = near.text;

    const open = takePhrase(text, OPEN_NOW_PHRASES);
    text = open.text;

    const area = extractArea(text);
    text = area.text;

    const budget = extractMaxPrice(raw, text);
    text = budget.text;

    const quality = extractQuality(text);
    text = quality.text;

    const price = extractPrice(text);
    text = price.text;

    const cats = extractCategories(text);
    text = cats.text;

    const attrs = extractAttributes(text);
    text = attrs.text;

    const tokens = text
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !STOPWORDS.has(t));

    const itemTerms =
      tokens.length > 0 ? [tokens.join(" ")].filter(Boolean) : ([] as string[]);

    const freeTextTokens = tokens;

    const intent = inferIntent({
      categorySlugs: cats.categorySlugs,
      itemTerms,
      serviceTerms: cats.serviceTerms,
      remaining: tokens.join(" "),
    });

    const categorySlugs = [...cats.categorySlugs];
    if (
      categorySlugs.length === 0 &&
      (attrs.attributes.some((a) =>
        [
          "north_indian",
          "south_indian",
          "maharashtrian",
          "chinese",
          "italian",
          "biryani",
          "vegetarian",
          "vegan",
          "jain",
        ].includes(a),
      ) ||
        itemTerms.some((t) =>
          /curry|pizza|biryani|misal|vada pav|dosa|coffee|noodles|manchurian/.test(t),
        ))
    ) {
      categorySlugs.push("restaurants");
    }

    if (categorySlugs.length === 0 && /fade|haircut|barber/.test(raw.toLowerCase())) {
      categorySlugs.push("barbers");
    }

    if (
      categorySlugs.length === 0 &&
      CLOTHING_ITEM_PATTERN.test(raw.toLowerCase())
    ) {
      categorySlugs.push("clothing-fashion");
    }

    const expandedTerms = [
      ...new Set([...itemTerms, ...cats.serviceTerms].flatMap((t) => expandSynonyms(t))),
    ];

    return {
      raw,
      normalized: normalize(raw),
      intent,
      categorySlugs,
      itemTerms,
      expandedTerms,
      serviceTerms: cats.serviceTerms,
      attributes: attrs.attributes,
      pricePreference: price.pricePreference,
      maxPriceCents: budget.maxPriceCents,
      qualityPreference: quality.qualityPreference,
      location: near.matched
        ? { mode: "near_me" }
        : area.areaSlug
          ? {
              mode: "named",
              areaSlug: area.areaSlug,
              label: area.label,
            }
          : { mode: "none" },
      openNow: open.matched,
      freeTextTokens,
    };
  }

  /** Product-facing compact intent (see SEARCH.md example). */
  summarize(parsed: ParsedSearchQuery): SearchIntentSummary {
    const location =
      parsed.location.mode === "near_me"
        ? "current"
        : parsed.location.mode === "named"
          ? (parsed.location.label ?? parsed.location.areaSlug ?? null)
          : null;

    return {
      item: parsed.itemTerms[0] ?? null,
      category: categoryToSingular(parsed.categorySlugs[0]),
      location,
      intent: parsed.intent,
      qualityPreference: parsed.qualityPreference,
      pricePreference: parsed.pricePreference,
      maxPriceCents: parsed.maxPriceCents,
      openNow: parsed.openNow,
      attributes: parsed.attributes,
    };
  }
}

export const searchParser = new SearchParser();

/**
 * Text sent to FTS / trigram retrieval.
 * Category, area, and other structured tokens are already stripped by the parser —
 * do not fall back to the raw query or "perfume in wagholi" will require both
 * words to appear on the listing.
 */
export function buildSearchRetrievalQuery(parsed: ParsedSearchQuery): string {
  return [
    ...parsed.itemTerms,
    ...parsed.expandedTerms,
    ...parsed.serviceTerms,
    ...parsed.freeTextTokens,
  ]
    .map((term) => term.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}
