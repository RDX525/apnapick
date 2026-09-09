"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Filter, Map as MapIcon, List, Navigation } from "lucide-react";
import { BusinessResultCard } from "@/components/search/business-result-card";
import { SponsoredResultCard } from "@/components/search/sponsored-result-card";
import { ShareResultsButton } from "@/components/search/share-results-button";
import { SearchBox } from "@/components/search/search-box";
import { BackLink } from "@/components/navigation/back-link";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DiscoveryMapPanel } from "@/components/maps/discovery-map-panel";
import { LocationControl } from "@/features/geo/location-control";
import type { SearchFilters, SearchResponse, SearchSort } from "@/domain/search/types";
import type { DiscoveryLocation, MapMarker } from "@/domain/geo/types";
import { cn } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/config/consumer-content";
import { isDiscoveryAreaSlug } from "@/config/geo-areas";
import { CURRENT_LOCATION_VALUE } from "@/lib/geo/device-location";
import { buildSearchHref } from "@/lib/search/search-url";
import { mapsDirectionsUrl } from "@/lib/geo/directions";
import { formatInrFromCents } from "@/lib/money/inr";

type CoordMap = Record<string, { lat: number; lng: number; suburb: string | null }>;

type Props = {
  query: string;
  area?: string;
  sort: SearchSort;
  response: SearchResponse;
  openNowOnly?: boolean;
  mapsEnabled?: boolean;
  initialCoords?: CoordMap;
  initialLocation: DiscoveryLocation;
  filters?: SearchFilters;
};

export function SearchResultsView({
  query,
  area,
  sort,
  response,
  openNowOnly = false,
  mapsEnabled = false,
  initialCoords = {},
  initialLocation,
  filters,
}: Props) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [mobileMap, setMobileMap] = useState(false);
  const [desktopMap, setDesktopMap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fetchedCoords, setFetchedCoords] = useState<CoordMap>({});
  const [location, setLocation] = useState(initialLocation);
  const [locationSource, setLocationSource] = useState(initialLocation);
  const hoverSelectTimer = useRef<number | null>(null);
  const requestedCoordinateIds = useRef(new Set<string>());
  const pendingRevealResult = useRef<string | null>(null);
  const coordsRef = useRef<CoordMap>(initialCoords);
  const results = response.results;
  const coords = useMemo(
    () => ({ ...initialCoords, ...fetchedCoords }),
    [fetchedCoords, initialCoords],
  );
  const activeSelectedId =
    selectedId && results.some((result) => result.businessId === selectedId)
      ? selectedId
      : null;

  if (initialLocation !== locationSource) {
    setLocationSource(initialLocation);
    setLocation(initialLocation);
  }

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktopMap(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!desktopMap && !mobileMap) return;
    const missing = results
      .map((r) => r.businessId)
      .filter((id) => !coordsRef.current[id] && !requestedCoordinateIds.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requestedCoordinateIds.current.add(id));
    const controller = new AbortController();
    void fetch(`/api/geo/coordinates?ids=${missing.join(",")}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((json: { data?: { coordinates?: CoordMap } }) => {
        if (!json.data?.coordinates) return;
        setFetchedCoords((prev) => ({ ...prev, ...json.data!.coordinates }));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          missing.forEach((id) => requestedCoordinateIds.current.delete(id));
          return;
        }
        /* list still works without coords */
      });
    return () => controller.abort();
  }, [results, desktopMap, mobileMap]);

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    for (const r of results) {
      const c = coords[r.businessId];
      if (!c) continue;
      out.push({
        id: r.businessId,
        position: { lat: c.lat, lng: c.lng },
        label: r.name,
        subtitle: r.suburb ?? null,
        href: `/b/${r.slug}`,
      });
    }
    return out;
  }, [results, coords]);

  const selectBusiness = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleMapSelect = useCallback(
    (id: string) => {
      selectBusiness(id);
      pendingRevealResult.current = id;
      setMobileMap(false);
    },
    [selectBusiness],
  );

  const selectBusinessSoon = useCallback((id: string) => {
    if (hoverSelectTimer.current != null) {
      window.clearTimeout(hoverSelectTimer.current);
    }
    hoverSelectTimer.current = window.setTimeout(() => {
      setSelectedId(id);
      hoverSelectTimer.current = null;
    }, 140);
  }, []);

  useEffect(
    () => () => {
      if (hoverSelectTimer.current != null) {
        window.clearTimeout(hoverSelectTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (mobileMap || !pendingRevealResult.current) return;
    const id = pendingRevealResult.current;
    const frame = requestAnimationFrame(() => {
      const result = document.getElementById(`result-${id}`);
      result?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      result?.focus({ preventScroll: true });
      pendingRevealResult.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [mobileMap]);

  const activeDirectionsUrl = useMemo(() => {
    if (!activeSelectedId) return null;
    const destination = coords[activeSelectedId];
    const result = results.find((item) => item.businessId === activeSelectedId);
    if (!destination || !result) return null;
    return mapsDirectionsUrl({
      destination,
      destinationLabel: result.name,
      origin: location.position,
    });
  }, [activeSelectedId, coords, location.position, results]);

  const sortLinks = [
    ["recommended", "Recommended"],
    ["distance", "Distance"],
    ["rating", "Rating"],
    ["reviews", "Most reviewed"],
  ] as const;

  function hrefFor(next: Record<string, string | null | undefined>) {
    return buildSearchHref({
      query,
      area,
      sort,
      openNow: openNowOnly,
      filters,
      location,
      overrides: next,
    });
  }

  function navigate(next: Record<string, string | null | undefined>) {
    startNavigation(() =>
      router.replace(hrefFor({ ...next, page: "1" }), { scroll: false }),
    );
  }

  function changeLocation(next: DiscoveryLocation) {
    setLocation(next);
    const unchanged =
      next.position.lat === location.position.lat &&
      next.position.lng === location.position.lng &&
      next.areaSlug === location.areaSlug;
    if (unchanged) return;
    startNavigation(() => {
      router.replace(
        hrefFor({
          lat: String(next.position.lat),
          lng: String(next.position.lng),
          area: next.areaSlug ?? null,
          page: "1",
        }),
        { scroll: false },
      );
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <BackLink href="/" />
      <SearchBox
        initialQuery={query}
        initialArea={area && isDiscoveryAreaSlug(area) ? area : CURRENT_LOCATION_VALUE}
        size="compact"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-ink text-2xl text-pretty sm:text-3xl">
            {response.query.itemTerms[0]
              ? `Best matches for “${response.query.itemTerms[0]}”`
              : response.query.serviceTerms[0]
                ? `Best matches for “${response.query.serviceTerms[0]}”`
                : `Results for “${query}”`}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {response.total === 0
              ? "No matches"
              : `Showing ${(response.page - 1) * response.pageSize + 1}–${Math.min(
                  response.page * response.pageSize,
                  response.total,
                )} of ${response.total}`}{" "}
            near {response.query.location.label ?? location.label}
            {response.query.maxPriceCents != null
              ? ` · under ${formatInrFromCents(response.query.maxPriceCents)}`
              : ""}
            {response.query.openNow ? " · open now" : ""}
          </p>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <ShareResultsButton
            query={query}
            item={
              response.query.itemTerms[0] ??
              response.query.serviceTerms[0] ??
              null
            }
            place={
              response.query.location.label ??
              location.label ??
              "Pune"
            }
            results={results}
            searchEventId={response.searchEventId}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 lg:hidden"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <Filter className="size-4" aria-hidden />
            Filters
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 lg:hidden"
            onClick={() => setMobileMap((v) => !v)}
            aria-pressed={mobileMap}
          >
            {mobileMap ? (
              <>
                <List className="size-4" aria-hidden />
                List
              </>
            ) : (
              <>
                <MapIcon className="size-4" aria-hidden />
                Map
              </>
            )}
          </Button>
          {sortLinks.map(([value, label]) => (
            <Link
              key={value}
              href={hrefFor({ sort: value, page: "1" })}
              replace
              scroll={false}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm",
                sort === value ||
                  (value === "recommended" && (sort === "relevance" || !sort))
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
        <aside
          className={cn("h-fit space-y-4", filtersOpen ? "block" : "hidden lg:block")}
          aria-label="Filters"
        >
          <LocationControl value={location} onChange={changeLocation} />
          <div className="ap-surface space-y-4 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Filters</p>
              <Link
                href={hrefFor({
                  open_now: null,
                  radius_m: null,
                  min_rating: null,
                  price: null,
                  verified: null,
                  has_offers: null,
                  category: null,
                  page: "1",
                })}
                replace
                scroll={false}
                className="text-sea text-xs font-medium hover:underline"
              >
                Clear all
              </Link>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Availability</Label>
              <Link
                href={hrefFor({
                  open_now: openNowOnly ? null : "1",
                  page: "1",
                })}
                replace
                scroll={false}
                className={cn(
                  "flex min-h-10 items-center rounded-xl px-3 text-sm",
                  openNowOnly ? "bg-primary text-primary-foreground" : "bg-secondary",
                )}
              >
                Open now
              </Link>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-filter" className="text-muted-foreground text-xs">
                Category
              </Label>
              <Select
                value={filters?.categorySlugs?.[0] ?? ""}
                onValueChange={(value) => navigate({ category: value || null })}
              >
                <SelectTrigger id="category-filter" className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <SelectItem key={category.slug} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance-filter" className="text-muted-foreground text-xs">
                Distance
              </Label>
              <Select
                value={String(filters?.distanceM ?? 12000)}
                onValueChange={(value) => navigate({ radius_m: value })}
              >
                <SelectTrigger id="distance-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2000">Within 2 km</SelectItem>
                  <SelectItem value="5000">Within 5 km</SelectItem>
                  <SelectItem value="12000">Within 12 km</SelectItem>
                  <SelectItem value="25000">Within 25 km</SelectItem>
                  <SelectItem value="50000">Any distance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating-filter" className="text-muted-foreground text-xs">
                Minimum rating
              </Label>
              <Select
                value={filters?.minRating ? String(filters.minRating) : "any"}
                onValueChange={(value) =>
                  navigate({ min_rating: value === "any" ? null : value })
                }
              >
                <SelectTrigger id="rating-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any rating</SelectItem>
                  <SelectItem value="4">4.0 and above</SelectItem>
                  <SelectItem value="4.5">4.5 and above</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-filter" className="text-muted-foreground text-xs">
                Price
              </Label>
              <Select
                value={filters?.priceLevels?.join(",") ?? "any"}
                onValueChange={(value) =>
                  navigate({ price: value === "any" ? null : value })
                }
              >
                <SelectTrigger id="price-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any price</SelectItem>
                  <SelectItem value="1,2">Budget</SelectItem>
                  <SelectItem value="2,3">Moderate</SelectItem>
                  <SelectItem value="3,4">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Link
                href={hrefFor({
                  verified: filters?.verifiedOnly ? null : "1",
                  page: "1",
                })}
                replace
                scroll={false}
                className={cn(
                  "flex min-h-10 items-center rounded-xl px-3 text-sm",
                  filters?.verifiedOnly
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary",
                )}
              >
                Verified businesses
              </Link>
              <Link
                href={hrefFor({
                  has_offers: filters?.hasOffers ? null : "1",
                  page: "1",
                })}
                replace
                scroll={false}
                className={cn(
                  "flex min-h-10 items-center rounded-xl px-3 text-sm",
                  filters?.hasOffers
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary",
                )}
              >
                Active offers
              </Link>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Understood as</Label>
              <dl className="text-muted-foreground space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt>Intent</dt>
                  <dd className="text-foreground">{response.query.intent}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Location</dt>
                  <dd className="text-foreground">{response.query.location.mode}</dd>
                </div>
              </dl>
            </div>
            {activeSelectedId && activeDirectionsUrl ? (
              <Button asChild className="min-h-10 w-full" size="sm">
                <a href={activeDirectionsUrl} target="_blank" rel="noopener noreferrer">
                  <Navigation className="size-4" aria-hidden />
                  Directions
                </a>
              </Button>
            ) : null}
          </div>
        </aside>

        <section
          className={cn("space-y-4", mobileMap && "hidden lg:block")}
          aria-label="Search results"
          aria-busy={navigating}
        >
          {response.sponsored && response.sponsored.length > 0 ? (
            <div
              className="border-accent/30 bg-accent/8 space-y-3 rounded-2xl border border-dashed p-3 sm:p-4"
              aria-label="Sponsored results"
            >
              <p className="text-accent text-xs font-medium tracking-wide uppercase">
                Sponsored
              </p>
              {response.sponsored.map((item) => (
                <SponsoredResultCard key={item.placementId} result={item} />
              ))}
            </div>
          ) : null}

          {results.length === 0 ? (
            <EmptyState
              title="No matches yet"
              description="Try a broader query, a larger distance, or fewer filters."
              actionLabel="Back to home"
              actionHref="/"
            />
          ) : (
            results.map((result, index) => (
              <div
                key={result.businessId}
                id={`result-${result.businessId}`}
                tabIndex={-1}
                className={cn(
                  "rounded-2xl ring-offset-2 transition",
                  activeSelectedId === result.businessId && "ring-sea/60 ring-2",
                )}
                onMouseEnter={() => selectBusinessSoon(result.businessId)}
                onFocus={() => selectBusiness(result.businessId)}
              >
                <BusinessResultCard
                  result={result}
                  priority={index === 0}
                />
              </div>
            ))
          )}
          {response.total > response.pageSize ? (
            <Pagination
              page={response.page}
              pageSize={response.pageSize}
              total={response.total}
              hrefForPage={(page) => hrefFor({ page: String(page) })}
              className="pt-3"
            />
          ) : null}
        </section>

        <aside
          className={cn(
            "ap-surface relative h-fit overflow-hidden rounded-3xl shadow-[0_20px_50px_-24px_rgb(15_23_42/0.35)] ring-1 ring-black/5 [contain:layout_paint]",
            mobileMap ? "block" : "hidden lg:block",
            "lg:sticky lg:top-[var(--ap-header-offset)]",
          )}
          aria-label="Map"
        >
          <div className="pointer-events-none absolute top-3 right-3 left-3 z-20 flex items-center justify-between">
            <span className="bg-card text-foreground rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-black/5">
              Explore nearby
            </span>
            <span className="bg-card text-muted-foreground rounded-full px-2.5 py-1.5 text-[11px] ring-1 ring-black/5">
              {markers.length} places
            </span>
          </div>
          {desktopMap || mobileMap ? (
            <DiscoveryMapPanel
              center={location.position}
              userPosition={
                location.source === "device" || location.source === "search"
                  ? location.position
                  : null
              }
              markers={markers}
              selectedId={activeSelectedId}
              mapsEnabled={mapsEnabled}
              onSelect={handleMapSelect}
            />
          ) : (
            <div className="ap-map-canvas ap-map-premium text-muted-foreground flex aspect-[4/5] min-h-[320px] items-center justify-center text-sm">
              Loading map…
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
