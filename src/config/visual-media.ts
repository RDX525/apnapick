/** Optimized editorial photography. Parent surfaces provide a visual fallback. */
const unsplash = (photoId: string, width = 1800) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;

export const MEDIA = {
  puneCity: "/images/ShaniwarWada.jpg",
  loginAtmosphere: unsplash("photo-1517248135467-4c7edcad34c4", 1200),
  restaurants: unsplash("photo-1414235077428-338989a2e8c0"),
  foodDining: unsplash("photo-1414235077428-338989a2e8c0"),
  cafes: unsplash("photo-1501339847302-ac426a4a7cbb", 1200),
  barbers: unsplash("photo-1503951914875-452162b0f3f1", 1200),
  plumbers: unsplash("photo-1585704032915-c3400ca199e7", 1200),
  beauty: unsplash("photo-1540555700478-4be289fbecef"),
  clothingFashion: unsplash("photo-1483985988355-763728e1935b"),
  shoppingRetail: unsplash("photo-1472851294608-062f824d29cc"),
  homeRepair: unsplash("photo-1581578731548-c64695cc6952"),
  fitnessSports: unsplash("photo-1534438327276-14e5300c3a48"),
  healthWellness: unsplash("photo-1544367567-0f2fcb009e0b"),
  automotive: unsplash("photo-1487754180451-c456f719a1fc"),
  educationLearning: unsplash("photo-1524995997946-a1c2e315a42f"),
  curry: unsplash("photo-1742599361574-6fb156181466", 1200),
  biryani:
    "https://images.pexels.com/photos/34382327/pexels-photo-34382327.jpeg?auto=compress&cs=tinysrgb&w=1200",
  pizza: unsplash("photo-1574071318508-1cdbab80d002", 900),
  noodles: unsplash("photo-1569718212165-3a8278d5f624", 900),
  thali: unsplash("photo-1547592180-85f173990554", 900),
  misalPav:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Katakirr_Misal_Pav.jpg/1920px-Katakirr_Misal_Pav.jpg",
  pavBhaji: "/images/Pav%20Bhaji.jpeg",
  vegBowl: unsplash("photo-1512621776951-a57141f2eefd", 900),
  coffee:
    "https://images.pexels.com/photos/16128085/pexels-photo-16128085.jpeg?auto=compress&cs=tinysrgb&w=1200",
  barberCut: unsplash("photo-1541533848490-bc8115cd6522", 1200),
  plumberWork:
    "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1200",
} as const;

const CATEGORY_IMAGES: Record<string, string> = {
  "food-dining": MEDIA.foodDining,
  restaurants: MEDIA.restaurants,
  cafes: MEDIA.cafes,
  barbers: MEDIA.barbers,
  plumbers: MEDIA.plumbers,
  services: MEDIA.homeRepair,
  "home-repair": MEDIA.homeRepair,
  "beauty-personal-care": MEDIA.beauty,
  "clothing-fashion": MEDIA.clothingFashion,
  "shopping-retail": MEDIA.shoppingRetail,
  "fitness-sports": MEDIA.fitnessSports,
  gyms: MEDIA.fitnessSports,
  "health-wellness": MEDIA.healthWellness,
  dentists: MEDIA.healthWellness,
  automotive: MEDIA.automotive,
  "education-learning": MEDIA.educationLearning,
};

const ITEM_IMAGES: Record<string, string> = {
  "chicken curry": MEDIA.curry,
  biryani: MEDIA.biryani,
  "misal pav": MEDIA.misalPav,
  "pav bhaji": MEDIA.pavBhaji,
  "skin fade": MEDIA.barberCut,
  "filter coffee": MEDIA.coffee,
  "leaking tap repair": MEDIA.plumberWork,
};

export function categoryCover(slug?: string | null, label?: string | null): string {
  if (slug && CATEGORY_IMAGES[slug]) return CATEGORY_IMAGES[slug];
  const key = `${slug ?? ""} ${label ?? ""}`.toLowerCase();
  if (
    key.includes("beauty") ||
    key.includes("skincare") ||
    key.includes("skin care") ||
    key.includes("perfume") ||
    key.includes("cosmetic") ||
    key.includes("makeup") ||
    key.includes("spa")
  ) {
    return MEDIA.beauty;
  }
  if (key.includes("cloth") || key.includes("fashion") || key.includes("boutique")) {
    return MEDIA.clothingFashion;
  }
  if (key.includes("shop") || key.includes("retail") || key.includes("store")) {
    return MEDIA.shoppingRetail;
  }
  if (key.includes("gym") || key.includes("fitness") || key.includes("sport")) {
    return MEDIA.fitnessSports;
  }
  if (
    key.includes("health") ||
    key.includes("wellness") ||
    key.includes("clinic") ||
    key.includes("dentist") ||
    key.includes("yoga")
  ) {
    return MEDIA.healthWellness;
  }
  if (key.includes("auto") || key.includes("car") || key.includes("garage")) {
    return MEDIA.automotive;
  }
  if (
    key.includes("educat") ||
    key.includes("school") ||
    key.includes("tutor") ||
    key.includes("coach") ||
    key.includes("learn")
  ) {
    return MEDIA.educationLearning;
  }
  if (key.includes("cafe") || key.includes("café") || key.includes("coffee")) {
    return MEDIA.cafes;
  }
  if (key.includes("barber") || key.includes("salon") || key.includes("groom")) {
    return MEDIA.barbers;
  }
  if (
    key.includes("plumb") ||
    key.includes("repair") ||
    key.includes("electric") ||
    key.includes("service")
  ) {
    return MEDIA.homeRepair;
  }
  return MEDIA.foodDining;
}

export function itemCover(name: string): string {
  return ITEM_IMAGES[name.toLowerCase()] ?? MEDIA.foodDining;
}
