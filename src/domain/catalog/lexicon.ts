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
};

export const PRICE_WORDS: Record<"cheap" | "moderate" | "premium", string[]> = {
  cheap: ["cheap", "budget", "affordable", "inexpensive", "sasta"],
  moderate: ["moderate", "mid-range"],
  premium: ["premium", "fine dining", "upscale", "luxury"],
};

export const QUALITY_WORDS = ["best", "top", "greatest", "finest"] as const;

export const OPEN_NOW_PHRASES = ["open now", "open tonight", "currently open"] as const;

export const NEAR_ME_PHRASES = ["near me", "nearby", "close by", "around me"] as const;

/** Pune neighbourhoods & named areas — slug → display + aliases */
export const PUNE_AREAS: Record<string, { label: string; aliases: string[] }> = {
  pune: { label: "Pune", aliases: ["pune", "poona"] },
  "koregaon-park": {
    label: "Koregaon Park",
    aliases: ["koregaon park", "kp", "koregaon"],
  },
  baner: { label: "Baner", aliases: ["baner"] },
  aundh: { label: "Aundh", aliases: ["aundh"] },
  hinjewadi: { label: "Hinjewadi", aliases: ["hinjewadi", "hinjewadi it park"] },
  kothrud: { label: "Kothrud", aliases: ["kothrud"] },
  "viman-nagar": { label: "Viman Nagar", aliases: ["viman nagar", "vimannagar"] },
  camp: { label: "Camp", aliases: ["camp", "pune camp"] },
  deccan: { label: "Deccan", aliases: ["deccan", "deccan gymkhana"] },
  hadapsar: { label: "Hadapsar", aliases: ["hadapsar"] },
  wakad: { label: "Wakad", aliases: ["wakad"] },
  kharadi: { label: "Kharadi", aliases: ["kharadi"] },
  wagholi: { label: "Wagholi", aliases: ["wagholi"] },
  lohegaon: {
    label: "Lohegaon",
    aliases: ["lohegaon", "lohegoan", "lohegaon airport"],
  },
  "fc-road": { label: "FC Road", aliases: ["fc road", "fergusson college road"] },
  "jm-road": { label: "JM Road", aliases: ["jm road", "jangli maharaj road"] },
  shivajinagar: { label: "Shivajinagar", aliases: ["shivajinagar", "shivaji nagar"] },
  magarpatta: { label: "Magarpatta", aliases: ["magarpatta", "magarpatta city"] },
  "pimple-saudagar": {
    label: "Pimple Saudagar",
    aliases: ["pimple saudagar"],
  },
  kondhwa: { label: "Kondhwa", aliases: ["kondhwa"] },
  bibwewadi: { label: "Bibwewadi", aliases: ["bibwewadi"] },
  swargate: { label: "Swargate", aliases: ["swargate"] },
  "karve-nagar": { label: "Karve Nagar", aliases: ["karve nagar", "karvenagar"] },
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
