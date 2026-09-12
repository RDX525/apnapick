"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POPULAR_SEARCHES } from "@/config/consumer-content";
import { AreaSelect } from "@/features/geo/area-select";
import { CURRENT_LOCATION_VALUE } from "@/lib/geo/device-location";
import { isDiscoveryAreaSlug } from "@/config/geo-areas";
import { useDiscoveryArea } from "@/lib/geo/use-discovery-area";
import { discoverySearchHref } from "@/lib/search/resolve-search-location";
import { cn } from "@/lib/utils";

type SearchBoxProps = {
  initialQuery?: string;
  initialArea?: string;
  className?: string;
  size?: "hero" | "compact";
  autoFocus?: boolean;
};

export function SearchBox({
  initialQuery = "",
  initialArea = CURRENT_LOCATION_VALUE,
  className,
  size = "hero",
  autoFocus = false,
}: SearchBoxProps) {
  const router = useRouter();
  const { area, setArea, position, locating, placeLabel } = useDiscoveryArea();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialArea && isDiscoveryAreaSlug(initialArea)) {
      setArea(initialArea);
    }
  }, [initialArea, setArea]);

  useEffect(() => {
    if (query) return;
    const input = inputRef.current;
    if (!input) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let index = 0;
    const id = window.setInterval(() => {
      index = (index + 1) % POPULAR_SEARCHES.length;
      if (document.activeElement !== input) {
        input.placeholder = POPULAR_SEARCHES[index] ?? POPULAR_SEARCHES[0];
      }
    }, 3200);
    return () => window.clearInterval(id);
  }, [query]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q =
      query.trim() ||
      inputRef.current?.placeholder ||
      POPULAR_SEARCHES[0];
    startTransition(() => {
      router.push(
        discoverySearchHref({
          query: q,
          dropdownArea: area,
          devicePosition: position,
        }),
      );
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
        className={cn(
          "ap-glass w-full min-w-0 rounded-[1.55rem] p-1.5 sm:rounded-[1.75rem] sm:p-2",
          size === "compact" && "rounded-2xl",
          className,
        )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="apnapick-search">
          Search for places, dishes, or services
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 sm:px-3">
          <Search className="text-sea size-4 shrink-0 sm:size-5" aria-hidden />
          <Input
            ref={inputRef}
            id="apnapick-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={POPULAR_SEARCHES[0]}
            autoFocus={autoFocus}
            autoComplete="off"
            className={cn(
              "h-11 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 sm:h-12",
              size === "compact" && "h-11 text-sm",
            )}
          />
        </div>

        <div className="flex items-center gap-1.5 px-0.5 sm:gap-2 sm:px-0">
          <label className="sr-only" htmlFor="apnapick-location">
            Location
          </label>
          <div className="min-w-0 flex-1 sm:min-w-[11rem] sm:flex-none">
            <AreaSelect
              id="apnapick-location"
              value={area}
              onChange={setArea}
              locating={locating}
              placeLabel={placeLabel}
              className="h-11 rounded-full text-sm"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            aria-label={pending ? "Searching" : "Search"}
            className="size-11 min-h-11 flex-none rounded-full p-0 sm:min-w-[6.5rem] sm:px-5"
          >
            <ArrowRight className="size-4 sm:hidden" aria-hidden />
            <span className="hidden sm:inline">{pending ? "Searching…" : "Search"}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
