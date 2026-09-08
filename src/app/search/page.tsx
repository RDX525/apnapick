import { SearchResultsView } from "@/features/consumer/search-results-view";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicEnv } from "@/config/env";
import { sanitizeSearchQuery } from "@/lib/security/sanitize";
import { searchWithPlacements } from "@/services/search/get-search-service";
import { SearchBox } from "@/components/search/search-box";
import { isFeatureEnabled } from "@/config/feature-flags";
import { CURRENT_LOCATION_LABEL } from "@/lib/geo/device-location";
import { enrichWithCoordinates, locationFromAreaSlug } from "@/services/geo/geo-service";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    lat?: string;
    lng?: string;
    area?: string;
    open_now?: string;
    page?: string;
    radius_m?: string;
    min_rating?: string;
    price?: string;
    verified?: string;
    has_offers?: string;
    category?: string;
  }>;
};

export async function generateMetadata({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || "Search";
  return buildPageMetadata({
    title: q,
    description: `ApnaPick results for “${q}” in Pune.`,
    path: `/search?q=${encodeURIComponent(q)}`,
    noIndex: true,
    follow: false,
  });
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const env = getPublicEnv();
  const q = sanitizeSearchQuery(params.q ?? "");

  if (!q) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
        <h1 className="font-display text-ink text-3xl">Search Pune</h1>
        <SearchBox />
      </main>
    );
  }

  const sort =
    params.sort === "distance" ||
    params.sort === "rating" ||
    params.sort === "reviews" ||
    params.sort === "recommended" ||
    params.sort === "relevance"
      ? params.sort
      : "recommended";

  const areaLoc = params.area ? locationFromAreaSlug(params.area) : null;
  const lat = params.lat
    ? Number(params.lat)
    : (areaLoc?.position.lat ?? env.NEXT_PUBLIC_DEFAULT_LAT);
  const lng = params.lng
    ? Number(params.lng)
    : (areaLoc?.position.lng ?? env.NEXT_PUBLIC_DEFAULT_LNG);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const radiusM = Math.min(
    50000,
    Math.max(
      100,
      Number(params.radius_m) || Number(process.env.SEARCH_DEFAULT_RADIUS_M ?? 12000),
    ),
  );
  const minRating = params.min_rating ? Number(params.min_rating) : undefined;
  const priceLevels = params.price
    ?.split(",")
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 4);
  const filters = {
    distanceM: radiusM,
    minRating:
      minRating != null && minRating >= 1 && minRating <= 5 ? minRating : undefined,
    priceLevels: priceLevels?.length ? priceLevels : undefined,
    openNow: params.open_now === "1" ? true : undefined,
    verifiedOnly: params.verified === "1" ? true : undefined,
    hasOffers: params.has_offers === "1" ? true : undefined,
    categorySlugs: params.category
      ? params.category.split(",").filter(Boolean)
      : undefined,
  };

  const response = await searchWithPlacements({
    query: q,
    location: {
      lat,
      lng,
      areaSlug: params.area ?? areaLoc?.areaSlug ?? undefined,
      radiusM,
    },
    filters,
    sort,
    page,
    pageSize: 20,
  });

  const initialCoords = await enrichWithCoordinates(
    response.results.map((r) => r.businessId),
  );
  const viewKey = JSON.stringify({
    q,
    sort,
    lat,
    lng,
    area: params.area ?? null,
    page,
    filters,
  });

  return (
    <main className="flex-1">
      <SearchResultsView
        key={viewKey}
        query={q}
        area={params.area}
        sort={sort}
        response={response}
        openNowOnly={params.open_now === "1" || response.query.openNow}
        filters={filters}
        initialLocation={{
          position: { lat, lng },
          label: areaLoc?.label ?? (params.lat ? CURRENT_LOCATION_LABEL : "Pune"),
          areaSlug: params.area ?? areaLoc?.areaSlug ?? null,
          source: params.area ? "manual" : params.lat ? "device" : "default",
        }}
        mapsEnabled={isFeatureEnabled("mapsEnabled")}
        initialCoords={initialCoords}
      />
    </main>
  );
}
