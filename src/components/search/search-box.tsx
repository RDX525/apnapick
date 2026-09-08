"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POPULAR_SEARCHES } from "@/config/consumer-content";
import { AreaSelect } from "@/features/geo/area-select";
import {
  CURRENT_LOCATION_VALUE,
  isCurrentLocationValue,
  locateDevicePosition,
} from "@/lib/geo/device-location";
import { openLocationAccess } from "@/lib/geo/location-access";
import { useDiscoveryArea } from "@/lib/geo/use-discovery-area";
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
  const { area, setArea, position, locating } = useDiscoveryArea(initialArea);
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholder = useMemo(() => {
    return (
      POPULAR_SEARCHES[placeholderIndex % POPULAR_SEARCHES.length] ?? POPULAR_SEARCHES[0]
    );
  }, [placeholderIndex]);

  useEffect(() => {
    if (query) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % POPULAR_SEARCHES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [query]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim() || placeholder;
    void (async () => {
      const params = new URLSearchParams({ q });
      if (isCurrentLocationValue(area) || position) {
        const result = position
          ? { ok: true as const, position }
          : await locateDevicePosition();
        if (result.ok) {
          params.set("lat", String(result.position.lat));
          params.set("lng", String(result.position.lng));
        } else if (isCurrentLocationValue(area)) {
          openLocationAccess(result.reason, { force: true });
        }
      }
      if (area && area !== "pune" && !isCurrentLocationValue(area)) {
        params.set("area", area);
      }
      startTransition(() => {
        router.push(`/search?${params.toString()}`);
      });
    })();
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={cn(
        "ap-glass w-full rounded-2xl p-2",
        size === "compact" && "rounded-xl",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="apnapick-search">
          Search for places, dishes, or services
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <Search className="text-sea size-5 shrink-0" aria-hidden />
          <Input
            id="apnapick-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            className={cn(
              "h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0",
              size === "compact" && "h-11 text-sm",
            )}
          />
        </div>

        <div className="flex items-center gap-2 px-1 sm:px-0">
          <label className="sr-only" htmlFor="apnapick-location">
            Location
          </label>
          <div className="min-w-0 flex-1 sm:min-w-[11rem] sm:flex-none">
            <AreaSelect
              id="apnapick-location"
              value={area}
              onChange={setArea}
              locating={locating}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="min-h-11 min-w-[7rem] flex-1 px-5 sm:flex-none"
          >
            {pending ? "Searching…" : "Search"}
          </Button>
        </div>
      </div>
    </form>
  );
}
