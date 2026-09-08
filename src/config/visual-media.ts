/** Optimized editorial photography. Parent surfaces provide a visual fallback. */
export const MEDIA = {
  puneCity: "/images/ShaniwarWada.jpg",
  loginAtmosphere:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=88",
  restaurants:
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  cafes:
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
  barbers:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80",
  plumbers:
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1200&q=80",
  curry:
    "https://images.unsplash.com/photo-1742599361574-6fb156181466?auto=format&fit=crop&w=1800&q=88",
  biryani:
    "https://images.pexels.com/photos/34382327/pexels-photo-34382327.jpeg?auto=compress&cs=tinysrgb&w=1800",
  pizza:
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80",
  noodles:
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
  thali:
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80",
  misalPav:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Katakirr_Misal_Pav.jpg/1920px-Katakirr_Misal_Pav.jpg",
  pavBhaji: "/images/Pav%20Bhaji.jpeg",
  vegBowl:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
  coffee:
    "https://images.pexels.com/photos/16128085/pexels-photo-16128085.jpeg?auto=compress&cs=tinysrgb&w=1800",
  barberCut:
    "https://images.unsplash.com/photo-1541533848490-bc8115cd6522?auto=format&fit=crop&w=1800&q=88",
  plumberWork:
    "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1800",
} as const;

const CATEGORY_IMAGES: Record<string, string> = {
  restaurants: MEDIA.restaurants,
  cafes: MEDIA.cafes,
  barbers: MEDIA.barbers,
  plumbers: MEDIA.plumbers,
  services: MEDIA.plumbers,
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
  if (key.includes("cafe") || key.includes("café") || key.includes("coffee")) {
    return MEDIA.cafes;
  }
  if (key.includes("barber") || key.includes("salon") || key.includes("groom")) {
    return MEDIA.barbers;
  }
  if (key.includes("plumb") || key.includes("service")) return MEDIA.plumbers;
  return MEDIA.restaurants;
}

export function itemCover(name: string): string {
  return ITEM_IMAGES[name.toLowerCase()] ?? MEDIA.restaurants;
}
