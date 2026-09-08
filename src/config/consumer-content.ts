/** Static discovery prompts — not business inventory. Safe in all environments. */
export const POPULAR_SEARCHES = [
  "Pav bhaji near me",
  "Best Indian restaurant",
  "Best barber near me",
  "Best pizza open now",
] as const;

export const TRENDING_SEARCHES = [
  "misal pav near me",
  "best biryani in Hinjewadi",
  "best coffee near me",
  "plumber for leaking tap",
  "AC repair near me",
  "electrician near me",
  "south indian restaurant open now",
  "fade haircut near me",
] as const;

export const DEFAULT_CATEGORIES = [
  {
    slug: "restaurants",
    name: "Restaurants",
    description: "Dishes, cuisines, and dining",
  },
  {
    slug: "cafes",
    name: "Cafés",
    description: "Coffee, chai, and bakeries",
  },
  {
    slug: "barbers",
    name: "Barbers",
    description: "Fades, cuts, and grooming",
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description: "Perfume, skincare, and personal care",
  },
  {
    slug: "plumbers",
    name: "Plumbers",
    description: "Repairs and home services",
  },
] as const;

export const DEFAULT_AREAS = [
  { slug: "koregaon-park", name: "Koregaon Park", type: "suburb" },
  { slug: "baner", name: "Baner", type: "suburb" },
  { slug: "hinjewadi", name: "Hinjewadi", type: "suburb" },
  { slug: "kothrud", name: "Kothrud", type: "suburb" },
  { slug: "viman-nagar", name: "Viman Nagar", type: "suburb" },
  { slug: "fc-road", name: "FC Road", type: "suburb" },
  { slug: "wagholi", name: "Wagholi", type: "suburb" },
  { slug: "kharadi", name: "Kharadi", type: "suburb" },
  { slug: "lohegaon", name: "Lohegaon", type: "suburb" },
] as const;

export const POPULAR_ITEMS = [
  {
    name: "Chicken curry",
    href: "/restaurants/pune/indian/chicken-curry",
    kind: "Dish",
    blurb: "The weeknight classic Pune searches first",
  },
  {
    name: "Biryani",
    href: "/restaurants/pune/indian/biryani",
    kind: "Dish",
    blurb: "Layered rice, slow spice, late nights",
  },
  {
    name: "Misal pav",
    href: "/restaurants/pune/maharashtrian/misal-pav",
    kind: "Dish",
    blurb: "Local heat, breakfast through dinner",
  },
  {
    name: "Pav bhaji",
    href: "/restaurants/pune/maharashtrian/pav-bhaji",
    kind: "Dish",
    blurb: "Buttery pav, rich bhaji, pure Pune comfort",
  },
  {
    name: "Skin fade",
    href: "/barbers/pune/fade",
    kind: "Grooming",
    blurb: "Sharp lines and trusted chairs",
  },
  {
    name: "Filter coffee",
    href: "/cafes/pune/coffee/filter-coffee",
    kind: "Café",
    blurb: "South Indian brew, slow mornings",
  },
  {
    name: "Leaking tap repair",
    href: "/services/pune/plumber",
    kind: "Service",
    blurb: "Fast fixes when water won’t wait",
  },
] as const;

/** Home & local services people search for most in Pune */
export const COMMON_SERVICES = [
  {
    slug: "plumber",
    name: "Plumber",
    blurb: "Leaks, taps, and blocked drains",
    href: "/search?q=plumber+near+me",
  },
  {
    slug: "electrician",
    name: "Electrician",
    blurb: "Wiring, fans, and power issues",
    href: "/search?q=electrician+near+me",
  },
  {
    slug: "ac-repair",
    name: "AC repair",
    blurb: "Service, gas refill, and install",
    href: "/search?q=AC+repair+near+me",
  },
  {
    slug: "carpenter",
    name: "Carpenter",
    blurb: "Furniture, doors, and fittings",
    href: "/search?q=carpenter+near+me",
  },
  {
    slug: "cleaning",
    name: "House cleaning",
    blurb: "Deep clean and home help",
    href: "/search?q=house+cleaning+near+me",
  },
  {
    slug: "painter",
    name: "Painter",
    blurb: "Interior and exterior painting",
    href: "/search?q=painter+near+me",
  },
  {
    slug: "pest-control",
    name: "Pest control",
    blurb: "Termites, cockroaches, and more",
    href: "/search?q=pest+control+near+me",
  },
  {
    slug: "appliance",
    name: "Appliance repair",
    blurb: "Fridge, washer, and RO service",
    href: "/search?q=appliance+repair+near+me",
  },
] as const;
