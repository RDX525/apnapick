export type ConsumerBusinessCard = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avgRating: number;
  reviewCount: number;
  priceLevel: number | null;
  isClaimed: boolean;
  isVerified: boolean;
  openNow: boolean | null;
  suburb: string | null;
  city: string | null;
  distanceM: number | null;
  categoryLabel: string | null;
  categorySlugs?: string[];
  matchedItem: string | null;
  matchedItemPriceCents?: number | null;
  phone?: string | null;
  coverImageUrl: string | null;
  lat: number | null;
  lng: number | null;
};

export type ConsumerBusinessProfile = ConsumerBusinessCard & {
  phone: string | null;
  website: string | null;
  email: string | null;
  about: string | null;
  addressLine1: string | null;
  postcode: string | null;
  completeness: number;
  photos: { id: string; url: string; alt: string | null }[];
  products: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
  }[];
  menu: {
    id: string;
    name: string;
    categories: {
      id: string;
      name: string;
      items: {
        id: string;
        name: string;
        description: string | null;
        priceCents: number | null;
      }[];
    }[];
  }[];
  offers: {
    id: string;
    title: string;
    description: string | null;
    discountLabel: string | null;
  }[];
  amenities: { key: string; label: string; value: string }[];
  hours: {
    dayOfWeek: number;
    opensAt: string | null;
    closesAt: string | null;
    isClosed: boolean;
  }[];
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    createdAt: string;
    authorName: string | null;
    replyBody: string | null;
    repliedAt: string | null;
    userId: string;
  }[];
};

export type HomepageContent = {
  popularSearches: string[];
  trendingSearches: string[];
  categories: { slug: string; name: string; description: string | null }[];
  areas: { slug: string; name: string; type: string }[];
  popularBusinesses: ConsumerBusinessCard[];
  popularItems: {
    name: string;
    businessCount: number;
    href: string;
    kind?: string;
    blurb?: string;
  }[];
  dataSource: "supabase" | "empty";
};
