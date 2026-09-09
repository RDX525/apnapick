export type LexiconEntry = {
  slug: string;
  aliases: string[];
  kind: "category" | "service";
};

export const CATEGORY_LEXICON: LexiconEntry[] = [
  {
    slug: "restaurants",
    aliases: [
      "restaurant",
      "restaurants",
      "eatery",
      "dining",
      "food",
      "eat",
      "cuisine",
      "dhaba",
    ],
    kind: "category",
  },
  {
    slug: "cafes",
    aliases: ["cafe", "cafes", "coffee", "coffee shop", "bakery", "chai"],
    kind: "category",
  },
  {
    slug: "bars",
    aliases: ["bar", "bars", "pub", "pubs", "nightlife", "lounge"],
    kind: "category",
  },
  {
    slug: "barbers",
    aliases: ["barber", "barbers", "barbershop", "fade", "haircut", "salon", "hair"],
    kind: "category",
  },
  {
    slug: "beauty-personal-care",
    aliases: [
      "beauty",
      "personal care",
      "beauty and personal care",
      "beauty & personal care",
      "beauty salon",
      "beauty parlour",
      "spa",
      "skincare",
      "skin care",
      "makeup",
      "cosmetics",
      "nail salon",
      "grooming",
      "perfume",
      "perfumes",
      "perfumery",
      "fragrance",
      "fragrances",
      "attar",
      "attars",
      "oud",
      "scent",
      "scents",
      "cologne",
    ],
    kind: "category",
  },
  {
    slug: "plumbers",
    aliases: ["plumber", "plumbers", "plumbing", "leaking tap", "blocked drain"],
    kind: "service",
  },
  {
    slug: "electricians",
    aliases: ["electrician", "electricians", "electrical", "wiring"],
    kind: "service",
  },
  {
    slug: "ac-repair",
    aliases: [
      "ac repair",
      "ac service",
      "air conditioner",
      "aircon",
      "hvac",
      "ac technician",
    ],
    kind: "service",
  },
  {
    slug: "carpenters",
    aliases: ["carpenter", "carpenters", "woodwork", "furniture repair"],
    kind: "service",
  },
  {
    slug: "cleaners",
    aliases: ["cleaner", "cleaning", "house cleaning", "maid", "deep clean"],
    kind: "service",
  },
  {
    slug: "painters",
    aliases: ["painter", "painters", "painting", "house painting"],
    kind: "service",
  },
  {
    slug: "pest-control",
    aliases: ["pest control", "termite", "cockroach", "pest"],
    kind: "service",
  },
  {
    slug: "appliance-repair",
    aliases: [
      "appliance repair",
      "fridge repair",
      "washing machine",
      "ro service",
      "geyser",
    ],
    kind: "service",
  },
  {
    slug: "dentists",
    aliases: ["dentist", "dentists", "dental"],
    kind: "category",
  },
  {
    slug: "gyms",
    aliases: ["gym", "gyms", "fitness", "workout"],
    kind: "category",
  },
  {
    slug: "food-dining",
    aliases: ["food and dining", "food & dining", "dining", "eat out"],
    kind: "category",
  },
  {
    slug: "clothing-fashion",
    aliases: [
      "clothing",
      "fashion",
      "boutique",
      "clothes",
      "apparel",
      "tailor",
      "menswear",
      "womenswear",
    ],
    kind: "category",
  },
  {
    slug: "shopping-retail",
    aliases: ["shopping", "retail", "store", "market", "supermarket"],
    kind: "category",
  },
  {
    slug: "home-repair",
    aliases: ["home repair", "home services", "handyman"],
    kind: "service",
  },
  {
    slug: "fitness-sports",
    aliases: ["fitness and sports", "sports", "yoga studio"],
    kind: "category",
  },
  {
    slug: "health-wellness",
    aliases: ["health", "wellness", "clinic", "doctor", "hospital"],
    kind: "category",
  },
  {
    slug: "automotive",
    aliases: ["automotive", "car service", "mechanic", "garage", "auto"],
    kind: "category",
  },
  {
    slug: "education-learning",
    aliases: ["education", "learning", "tutor", "tuition", "coaching", "classes"],
    kind: "category",
  },
];

export const CUISINE_FACETS: Record<string, string[]> = {
  north_indian: ["north indian", "punjabi", "mughlai", "tandoori", "butter chicken"],
  south_indian: ["south indian", "dosa", "idli", "uttapam", "filter coffee"],
  maharashtrian: [
    "maharashtrian",
    "misal",
    "misal pav",
    "vada pav",
    "pav bhaji",
    "puran poli",
  ],
  chinese: ["chinese", "indo chinese", "noodles", "manchurian"],
  italian: ["italian", "pizza", "pasta"],
  biryani: ["biryani", "hyderabadi biryani", "lucknowi"],
  vegetarian: ["vegetarian", "veg", "pure veg"],
  vegan: ["vegan"],
  jain: ["jain"],
  "non-veg": ["non veg", "non-veg"],
};

export const ATTRIBUTE_ALIASES: Record<string, string[]> = {
  vegetarian: ["vegetarian", "veg", "pure veg"],
  vegan: ["vegan"],
  jain: ["jain"],
  "air-conditioned": ["ac", "air conditioned", "air-conditioned"],
  outdoor_seating: ["outdoor", "rooftop", "garden"],
  office: ["office", "formal", "workwear", "work wear"],
  mens: ["mens", "for men"],
};

export const CLOTHING_ITEM_PATTERN =
  /\b(shirt|t-?shirts?|kurta|jeans|saree|sari|hoodie|dress|blazer)\b/i;

export const PRICE_WORDS: Record<"cheap" | "moderate" | "premium", string[]> = {
  cheap: ["cheap", "budget", "affordable", "inexpensive", "sasta"],
  moderate: ["moderate", "mid-range"],
  premium: ["premium", "fine dining", "upscale", "luxury"],
};

export const QUALITY_WORDS = ["best", "top", "greatest", "finest"] as const;

export const OPEN_NOW_PHRASES = ["open now", "open tonight", "currently open"] as const;

export const NEAR_ME_PHRASES = ["near me", "nearby", "close by", "around me"] as const;

/** Live neighbourhoods on ApnaPick — slug → display + aliases */
export const PUNE_AREAS: Record<string, { label: string; aliases: string[] }> = {
  pune: { label: "Pune", aliases: ["pune", "poona"] },
  kharadi: { label: "Kharadi", aliases: ["kharadi"] },
  wagholi: { label: "Wagholi", aliases: ["wagholi"] },
  lohegaon: {
    label: "Lohegaon",
    aliases: ["lohegaon", "lohegoan", "lohegaon airport"],
  },
};

/** @deprecated Use PUNE_AREAS — kept as alias for older imports */
export const AUCKLAND_AREAS = PUNE_AREAS;

export const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "to",
  "of",
  "and",
  "or",
  "with",
  "in",
  "at",
  "on",
  "me",
  "my",
  "i",
  "want",
  "looking",
  "find",
  "get",
  "some",
  "please",
]);
