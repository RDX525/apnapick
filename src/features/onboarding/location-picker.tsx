"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeocodeResult, LatLng } from "@/domain/geo/types";
import { OnboardingPinMap } from "@/features/onboarding/onboarding-pin-map";

function resultsFromGeocodeBody(body: unknown): GeocodeResult[] {
  if (!body || typeof body !== "object") return [];
  const root = body as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const results = nested.results ?? root.results;
  return Array.isArray(results) ? (results as GeocodeResult[]) : [];
}

export function OnboardingLocationPicker({
  street,
  address,
  lat,
  lng,
  onSelect,
}: {
  street: string;
  address: string;
  lat: number | null;
  lng: number | null;
  onSelect: (result: GeocodeResult) => void;
}) {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const lastAutoQuery = useRef("");
  const appliedId = useRef<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  function applyResult(result: GeocodeResult, options?: { keepList?: boolean }) {
    activeRequest.current?.abort();
    activeRequest.current = null;
    appliedId.current = result.id;
    setPickedLabel(result.label);
    onSelect(result);
    if (!options?.keepList) setResults([]);
    setStatus("idle");
    setErrorMessage(null);
  }

  async function findAddress(query: string, mode: "auto" | "exact") {
    const q = query.trim();
    if (mode === "exact" && !street.trim()) {
      setStatus("error");
      setErrorMessage("Enter the street address above, then click Find address.");
      return;
    }
    if (q.length < 3) {
      setStatus("error");
      setErrorMessage("Enter a complete address or set the pin on the map.");
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setStatus("searching");
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({ q });
      if (mode === "exact") params.set("exact", "1");
      const response = await fetch(`/api/geo/geocode?${params.toString()}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error("Location search failed");
      const matches = resultsFromGeocodeBody(await response.json());
      setResults(matches);
      if (matches.length === 0) {
        setStatus("error");
        setErrorMessage(
          mode === "exact"
            ? "Couldn’t find that street. Check the address, or tap the map."
            : "Couldn’t match that address yet. Add suburb and city, or tap the map.",
        );
        return;
      }
      setStatus("idle");
      const first = matches[0]!;
      if (mode === "exact" || appliedId.current !== first.id) {
        lastAutoQuery.current = q;
        applyResult(first, { keepList: matches.length > 1 });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
      setErrorMessage("Couldn’t find that address. Try again, or tap the map.");
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  useEffect(() => {
    if (lat != null && lng != null) return;
    if (!street.trim()) return;
    const query = address.trim();
    if (query.length < 3) return;
    if (query === lastAutoQuery.current) return;
    const timer = window.setTimeout(() => {
      void findAddress(query, "auto");
    }, 450);
    return () => {
      window.clearTimeout(timer);
      activeRequest.current?.abort();
    };
    // Autopick when the composed address changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, street, lat, lng]);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
    },
    [],
  );

  const pin: LatLng | null = lat != null && lng != null ? { lat, lng } : null;

  return (
    <div className="ap-inset rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="text-sea size-4" aria-hidden />
            Map pin
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Find address pins the street entered above. Click or drag the pin to
            fine-tune.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={status === "searching"}
          onClick={() => void findAddress(address, "exact")}
        >
          <LocateFixed className="size-4" aria-hidden />
          {status === "searching" ? "Finding…" : "Find address"}
        </Button>
      </div>

      <div className="mt-3">
        <OnboardingPinMap
          position={pin}
          onPick={(position) =>
            applyResult({
              id: `manual:${position.lat.toFixed(5)},${position.lng.toFixed(5)}`,
              label: pickedLabel ?? "Dropped pin",
              position,
              source: "manual",
            })
          }
        />
      </div>

      {status === "error" && errorMessage ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {errorMessage}
        </p>
      ) : null}
      {pickedLabel && pin ? (
        <p role="status" className="text-muted-foreground mt-3 text-xs">
          Pin set at {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)} · {pickedLabel}
        </p>
      ) : pin ? (
        <p role="status" className="text-muted-foreground mt-3 text-xs">
          Current pin: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
        </p>
      ) : null}
      {results.length > 1 ? (
        <ul className="mt-3 space-y-2" aria-label="Other address matches">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="bg-card hover:border-sea/40 focus-visible:ring-ring border-border flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => applyResult(result)}
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
    </div>
  );
}
