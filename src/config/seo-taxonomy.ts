/**
 * Programmatic SEO taxonomy for Pune.
 * Pages are only indexable when density gates pass against real listings —
 * this file defines *candidates*, not guaranteed URLs.
 */

export type SeoFacetDef = {
  slug: string;
  name: string;
  /** Synonym slugs that canonicalise to this facet */
  aliases?: string[];
  matchTerms: string[];
  items?: { slug: string; name: string; matchTerms: string[] }[];
};

export type SeoCategoryDef = {
  slug: string;
  name: string;
  description: string;
  schemaKind: "restaurant" | "local_business" | "service" | "mixed";
  /** Maps listing category slugs that contribute supply for this hub */
  supplyCategorySlugs: string[];
  facets: SeoFacetDef[];
};

export const SEO_CATEGORIES: SeoCategoryDef[] = [
  {
    slug: "restaurants",
    name: "Restaurants",
    description: "Dishes, cuisines, and dining across Pune",
    schemaKind: "restaurant",
    supplyCategorySlugs: ["restaurants"],
    facets: [
      {
        slug: "indian",
        name: "Indian",
        aliases: ["north-indian"],
        matchTerms: ["indian", "north indian", "punjabi", "mughlai", "tandoori"],
        items: [
          {
            slug: "chicken-curry",
            name: "Chicken curry",
            matchTerms: ["chicken curry", "curry chicken", "butter chicken"],
          },
          {
            slug: "biryani",
            name: "Biryani",
            matchTerms: ["biryani"],
          },
        ],
      },
      {
        slug: "maharashtrian",
        name: "Maharashtrian",
        matchTerms: ["maharashtrian", "misal", "vada pav", "pav bhaji"],
        items: [
          {
            slug: "misal-pav",
            name: "Misal pav",
            matchTerms: ["misal pav", "misal"],
          },
          {
            slug: "pav-bhaji",
            name: "Pav bhaji",
            matchTerms: ["pav bhaji"],
          },
        ],
      },
      {
        slug: "south-indian",
        name: "South Indian",
        matchTerms: ["south indian", "dosa", "idli", "uttapam"],
        items: [
          {
            slug: "dosa",
            name: "Dosa",
            matchTerms: ["dosa", "masala dosa"],
          },
        ],
      },
    ],
  },
  {
    slug: "cafes",
    name: "Cafés",
    description: "Coffee, chai, and bakeries in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["cafes"],
    facets: [
      {
        slug: "coffee",
        name: "Coffee",
        matchTerms: ["coffee", "filter coffee", "espresso", "cafe"],
        items: [
          {
            slug: "filter-coffee",
            name: "Filter coffee",
            matchTerms: ["filter coffee", "south indian coffee"],
          },
        ],
      },
    ],
  },
  {
    slug: "barbers",
    name: "Barbers",
    description: "Fades, cuts, and grooming in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["barbers"],
    facets: [
      {
        slug: "fade",
        name: "Fade",
        aliases: ["skin-fade"],
        matchTerms: ["fade", "skin fade", "haircut", "hair cut"],
        items: [
          {
            slug: "skin-fade",
            name: "Skin fade",
            matchTerms: ["skin fade", "bald fade"],
          },
        ],
      },
      {
        slug: "beard",
        name: "Beard",
        matchTerms: ["beard", "beard trim", "shave"],
      },
    ],
  },
  {
    slug: "services",
    name: "Services",
    description: "Home and local services across Pune",
    schemaKind: "service",
    supplyCategorySlugs: [
      "plumbers",
      "electricians",
      "services",
      "ac-repair",
      "carpenters",
      "cleaners",
      "painters",
      "pest-control",
      "appliance-repair",
    ],
    facets: [
      {
        slug: "plumber",
        name: "Plumber",
        aliases: ["plumbing"],
        matchTerms: ["plumber", "plumbing", "leaking tap", "blocked drain"],
        items: [
          {
            slug: "leaking-tap",
            name: "Leaking tap repair",
            matchTerms: ["leaking tap", "tap repair", "leak"],
          },
        ],
      },
      {
        slug: "electrician",
        name: "Electrician",
        matchTerms: ["electrician", "electrical", "wiring"],
      },
      {
        slug: "ac-repair",
        name: "AC repair",
        aliases: ["ac", "hvac"],
        matchTerms: ["ac repair", "ac service", "air conditioner", "hvac"],
      },
      {
        slug: "carpenter",
        name: "Carpenter",
        matchTerms: ["carpenter", "woodwork", "furniture repair"],
      },
      {
        slug: "cleaning",
        name: "House cleaning",
        aliases: ["cleaner"],
        matchTerms: ["house cleaning", "cleaner", "maid", "deep clean"],
      },
      {
        slug: "painter",
        name: "Painter",
        matchTerms: ["painter", "painting", "house painting"],
      },
      {
        slug: "pest-control",
        name: "Pest control",
        matchTerms: ["pest control", "termite", "cockroach"],
      },
      {
        slug: "appliance-repair",
        name: "Appliance repair",
        matchTerms: ["appliance repair", "fridge repair", "washing machine", "ro"],
      },
    ],
  },
  {
    slug: "plumbers",
    name: "Plumbers",
    description: "Plumbing repairs and installs in Pune",
    schemaKind: "service",
    supplyCategorySlugs: ["plumbers"],
    facets: [
      {
        slug: "leaking-tap",
        name: "Leaking tap",
        matchTerms: ["leaking tap", "tap repair"],
      },
    ],
  },
];

export const SEO_AREA_SLUGS = new Set([
  "pune",
  "koregaon-park",
  "baner",
  "hinjewadi",
  "kothrud",
  "viman-nagar",
  "fc-road",
  "aundh",
  "wakad",
  "kharadi",
  "wagholi",
  "lohegaon",
  "hadapsar",
  "shivajinagar",
  "camp",
  "deccan",
  "jm-road",
  "magarpatta",
  "pimple-saudagar",
  "kondhwa",
  "bibwewadi",
  "swargate",
  "karve-nagar",
]);

export function getSeoCategory(slug: string) {
  return SEO_CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function isSeoCategorySlug(slug: string) {
  return SEO_CATEGORIES.some((c) => c.slug === slug);
}

export function resolveFacetCanonical(
  category: SeoCategoryDef,
  facetSlug: string,
): SeoFacetDef | null {
  const direct = category.facets.find((f) => f.slug === facetSlug);
  if (direct) return direct;
  for (const facet of category.facets) {
    if (facet.aliases?.includes(facetSlug)) return facet;
  }
  return null;
}

export function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
