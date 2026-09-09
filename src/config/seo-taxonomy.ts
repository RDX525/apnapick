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
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description: "Perfume, skincare, and personal care in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["beauty-personal-care"],
    facets: [
      {
        slug: "spas",
        name: "Spas",
        matchTerms: ["spa", "massage", "facial", "wellness"],
      },
      {
        slug: "skincare",
        name: "Skincare",
        matchTerms: ["skincare", "skin care", "facial", "beauty treatment"],
      },
      {
        slug: "perfume",
        name: "Perfume",
        aliases: ["fragrance", "attar"],
        matchTerms: ["perfume", "fragrance", "attar", "oud", "scent", "cologne"],
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
  {
    slug: "food-dining",
    name: "Food & Dining",
    description: "Restaurants, cafés, and local flavour across Pune",
    schemaKind: "restaurant",
    supplyCategorySlugs: ["restaurants", "cafes", "bars", "food-dining"],
    facets: [
      {
        slug: "indian",
        name: "Indian",
        aliases: ["north-indian"],
        matchTerms: ["indian", "north indian", "punjabi", "mughlai", "tandoori"],
      },
      {
        slug: "cafes",
        name: "Cafés",
        aliases: ["coffee"],
        matchTerms: ["cafe", "café", "coffee", "bakery"],
      },
    ],
  },
  {
    slug: "clothing-fashion",
    name: "Clothing & Fashion",
    description: "Boutiques, tailors, and fashion in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["clothing-fashion"],
    facets: [
      {
        slug: "boutiques",
        name: "Boutiques",
        matchTerms: ["boutique", "fashion", "clothing", "apparel"],
      },
      {
        slug: "tailors",
        name: "Tailors",
        matchTerms: ["tailor", "alteration", "stitching"],
      },
    ],
  },
  {
    slug: "shopping-retail",
    name: "Shopping & Retail",
    description: "Markets, stores, and everyday retail in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["shopping-retail"],
    facets: [
      {
        slug: "groceries",
        name: "Groceries",
        matchTerms: ["grocery", "supermarket", "kirana"],
      },
      {
        slug: "electronics",
        name: "Electronics",
        matchTerms: ["electronics", "mobile", "appliance store"],
      },
    ],
  },
  {
    slug: "home-repair",
    name: "Home & Repair Services",
    description: "Plumbers, electricians, and home fixes across Pune",
    schemaKind: "service",
    supplyCategorySlugs: [
      "home-repair",
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
    ],
  },
  {
    slug: "fitness-sports",
    name: "Fitness & Sports",
    description: "Gyms, yoga, and training in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["fitness-sports", "gyms"],
    facets: [
      {
        slug: "gyms",
        name: "Gyms",
        matchTerms: ["gym", "fitness", "workout", "training"],
      },
      {
        slug: "yoga",
        name: "Yoga",
        matchTerms: ["yoga", "pilates", "wellness studio"],
      },
    ],
  },
  {
    slug: "health-wellness",
    name: "Health & Wellness",
    description: "Clinics, dentists, and care in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["health-wellness", "dentists"],
    facets: [
      {
        slug: "clinics",
        name: "Clinics",
        matchTerms: ["clinic", "doctor", "hospital", "health"],
      },
      {
        slug: "dentists",
        name: "Dentists",
        matchTerms: ["dentist", "dental", "teeth"],
      },
    ],
  },
  {
    slug: "automotive",
    name: "Automotive",
    description: "Car service, repairs, and spares in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["automotive"],
    facets: [
      {
        slug: "service",
        name: "Service",
        matchTerms: ["car service", "auto service", "garage", "mechanic"],
      },
      {
        slug: "spares",
        name: "Spares",
        matchTerms: ["spare parts", "tyre", "battery"],
      },
    ],
  },
  {
    slug: "education-learning",
    name: "Education & Learning",
    description: "Classes, tutors, and coaching in Pune",
    schemaKind: "local_business",
    supplyCategorySlugs: ["education-learning"],
    facets: [
      {
        slug: "tutors",
        name: "Tutors",
        matchTerms: ["tutor", "tuition", "home tutor"],
      },
      {
        slug: "coaching",
        name: "Coaching",
        matchTerms: ["coaching", "classes", "institute"],
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

/** Expand a consumer hub slug to the listing slugs that belong in it. */
export function expandSupplyCategorySlugs(slugs: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const slug of slugs) {
    expanded.add(slug);
    const category = getSeoCategory(slug);
    if (!category) continue;
    for (const supply of category.supplyCategorySlugs) expanded.add(supply);
  }
  return [...expanded];
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
