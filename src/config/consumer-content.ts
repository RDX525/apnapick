/** Intent prompts — dish/service + budget, not category names. */
export const POPULAR_SEARCHES = [
  "Chicken curry under ₹300 near me",
  "Men's haircut under ₹500 open now",
  "Black shirt for office under ₹1500",
  "Best chicken curry in Kharadi",
] as const;

export const TRENDING_SEARCHES = [
  "Chicken curry under ₹300 in Kharadi",
  "Best biryani in Wagholi",
  "Men's haircut under ₹500 in Lohegaon",
  "Plumber for leaking tap in Kharadi",
  "South Indian restaurant open now in Wagholi",
  "AC repair in Lohegaon",
  "Black shirt for office under ₹1500 in Kharadi",
  "Fade haircut in Wagholi",
] as const;

export const DEFAULT_CATEGORIES = [
  {
    slug: "food-dining",
    name: "Food & Dining",
    description: "Restaurants, cafés, and local flavour",
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description: "Perfume, salons, spas, and skincare",
  },
  {
    slug: "clothing-fashion",
    name: "Clothing & Fashion",
    description: "Boutiques, tailors, and style",
  },
  {
    slug: "shopping-retail",
    name: "Shopping & Retail",
    description: "Markets, stores, and everyday buys",
  },
  {
    slug: "home-repair",
    name: "Home & Repair Services",
    description: "Plumbers, electricians, and fixes",
  },
  {
    slug: "fitness-sports",
    name: "Fitness & Sports",
    description: "Gyms, yoga, and training",
  },
  {
    slug: "health-wellness",
    name: "Health & Wellness",
    description: "Clinics, dentists, and care",
  },
  {
    slug: "automotive",
    name: "Automotive",
    description: "Service, repairs, and spares",
  },
  {
    slug: "education-learning",
    name: "Education & Learning",
    description: "Classes, tutors, and coaching",
  },
] as const;

export const DEFAULT_AREAS = [
  { slug: "kharadi", name: "Kharadi", type: "suburb" },
  { slug: "wagholi", name: "Wagholi", type: "suburb" },
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
