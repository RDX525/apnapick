"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DiscoveryLocation, GeocodeResult } from "@/domain/geo/types";
import {
  CURRENT_LOCATION_LABEL,
  locateDevicePosition,
} from "@/lib/geo/device-location";
import { openLocationAccess } from "@/lib/geo/location-access";
import {
  clearSessionLocation,
  loadSessionLocation,
  saveSessionLocation,
} from "@/lib/geo/session-location";
import { AREA_CENTROIDS, DISCOVERY_AREA_SLUGS } from "@/config/geo-areas";
import { cn } from "@/lib/utils";

type Props = {
  value: DiscoveryLocation;
  onChange: (next: DiscoveryLocation) => void;
  className?: string;
};

export function LocationControl({ value, onChange, className }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"locating" | "searching" | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const saved = loadSessionLocation();
    if (!saved) return;
    const unchanged =
      Math.abs(saved.position.lat - value.position.lat) < 0.0001 &&
      Math.abs(saved.position.lng - value.position.lng) < 0.0001 &&
      saved.areaSlug === value.areaSlug;
    if (!unchanged) onChange(saved);
    // GPS is requested from LocationAccessDialog / Near me — don't prompt twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply(next: DiscoveryLocation) {
    saveSessionLocation(next);
    onChange(next);
  }

  async function locateNearMe(options?: { silent?: boolean }) {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (!options?.silent) setError("Location is not available in this browser");
      openLocationAccess("unsupported", { force: !options?.silent });
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending("locating");
    const result = await locateDevicePosition();
    if (controller.signal.aborted) return;
    if (!result.ok) {
      if (!options?.silent) setError("Could not read current location");
      openLocationAccess(result.reason, { force: !options?.silent });
      setPending(null);
      return;
    }
    const coords = result.position;
    try {
      const res = await fetch(
        `/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`,
        { signal: controller.signal },
      );
      const json = (await res.json()) as {
        data?: { result?: { label?: string; areaSlug?: string | null } };
      };
      if (controller.signal.aborted) return;
      apply({
        position: coords,
        label: json.data?.result?.label ?? CURRENT_LOCATION_LABEL,
        areaSlug: json.data?.result?.areaSlug ?? null,
        source: "device",
      });
    } catch {
      if (controller.signal.aborted) return;
      apply({
        position: coords,
        label: CURRENT_LOCATION_LABEL,
        source: "device",
      });
    } finally {
      if (!controller.signal.aborted) setPending(null);
    }
  }

  function searchPlaces() {
    const q = query.trim();
    if (!q) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setError(null);
    setPending("searching");
    void (async () => {
      try {
        const res = await fetch(
          `/api/geo/geocode?q=${encodeURIComponent(q)}&lat=${value.position.lat}&lng=${value.position.lng}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setError("Location search failed");
          return;
        }
        const json = (await res.json()) as { data?: { results?: GeocodeResult[] } };
        setSuggestions(json.data?.results ?? []);
      } catch {
        if (controller.signal.aborted) return;
        setError("Location search failed");
      } finally {
        if (!controller.signal.aborted) setPending(null);
      }
    })();
  }

  return (
    <div className={cn("ap-surface space-y-3 rounded-2xl p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Location</p>
          <p className="text-muted-foreground text-xs">
            {value.label}
            {value.source !== "default" ? ` · ${value.source}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => void locateNearMe()}
          >
            <LocateFixed className="size-3.5" aria-hidden />
            {pending === "locating" ? "Locating…" : "Near me"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              clearSessionLocation();
              const pune = AREA_CENTROIDS.pune!;
              apply({
                position: pune.position,
                label: pune.label,
                areaSlug: "pune",
                source: "default",
              });
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchPlaces();
              }
            }}
            placeholder="Search area (Baner, Hinjewadi…)"
            className="min-h-10 pl-9"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="min-h-10"
          disabled={pending !== null}
          onClick={searchPlaces}
        >
          {pending === "searching" ? "Finding…" : "Find"}
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="hover:bg-secondary flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm"
                onClick={() => {
                  apply({
                    position: s.position,
                    label: s.label,
                    areaSlug: s.areaSlug,
                    source: "search",
                  });
                  setSuggestions([]);
                  setQuery(s.label);
                }}
              >
                <MapPin className="text-sea size-3.5 shrink-0" aria-hidden />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {DISCOVERY_AREA_SLUGS.map((slug) => {
          const meta = AREA_CENTROIDS[slug]!;
          return (
            <button
              key={slug}
              type="button"
              onClick={() =>
                apply({
                  position: meta.position,
                  label: meta.label,
                  areaSlug: slug,
                  source: "manual",
                })
              }
              className={cn(
                "min-h-11 rounded-full px-3 py-2 text-xs",
                value.areaSlug === slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <p className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
        <Crosshair className="mt-0.5 size-3 shrink-0" aria-hidden />
        Precise coordinates stay in this browser session only — never stored for
        analytics.
      </p>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
