import type { LatLng } from "@/domain/geo/types";

/** Build a directions URL locally; no server round-trip is needed for this pure operation. */
export function mapsDirectionsUrl(input: {
  destination: LatLng;
  destinationLabel?: string;
  origin?: LatLng | null;
}): string {
  const destination = `${input.destination.lat},${input.destination.lng}`;
  const params = new URLSearchParams({
    api: "1",
    destination: input.destinationLabel
      ? `${input.destinationLabel}@${destination}`
      : destination,
  });
  if (input.origin) {
    params.set("origin", `${input.origin.lat},${input.origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
