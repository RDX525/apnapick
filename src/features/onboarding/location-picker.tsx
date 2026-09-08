"use client";

import { useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeocodeResult } from "@/domain/geo/types";

export function OnboardingLocationPicker({
  address,
  lat,
  lng,
  onSelect,
}: {
  address: string;
  lat: number | null;
  lng: number | null;
  onSelect: (result: GeocodeResult) => void;
}) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");

  async function findAddress() {
    const query = address.trim();
    if (!query) {
      setStatus("error");
      return;
    }
    setStatus("searching");
    try {
      const response = await fetch(`/api/geo/geocode?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Location search failed");
      const body = (await response.json()) as {
        data?: { results?: GeocodeResult[] };
      };
      setResults(body.data?.results ?? []);
      setStatus(body.data?.results?.length ? "idle" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="ap-inset rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="text-sea size-4" aria-hidden />
            Confirm map location
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Search the street address, then choose the closest match. Manual coordinates
            remain available below.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={status === "searching"}
          onClick={findAddress}
        >
          <LocateFixed className="size-4" aria-hidden />
          {status === "searching" ? "Finding…" : "Find address"}
        </Button>
      </div>

      {status === "error" ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          Enter a complete address or set the coordinates manually.
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label="Address matches">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="bg-card hover:border-sea/40 focus-visible:ring-ring border-border flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => {
                  onSelect(result);
                  setResults([]);
                  setStatus("idle");
                }}
              >
                <span>{result.label}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {result.position.lat.toFixed(4)}, {result.position.lng.toFixed(4)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {lat != null && lng != null ? (
        <p role="status" className="text-muted-foreground mt-3 text-xs">
          Current pin: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}
