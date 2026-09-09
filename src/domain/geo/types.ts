export type LatLng = {
  lat: number;
  lng: number;
};

export type GeocodeResult = {
  id: string;
  label: string;
  position: LatLng;
  areaSlug?: string | null;
  source: "places" | "area_dictionary" | "manual";
};

export type ReverseGeocodeResult = {
  label: string;
  areaSlug?: string | null;
  suburb?: string | null;
  city?: string | null;
};

export type MapMarker = {
  id: string;
  position: LatLng;
  label: string;
  subtitle?: string | null;
  href?: string;
  selected?: boolean;
};

export type MapViewport = {
  center: LatLng;
  zoom: number;
};

export type NearbyBusiness = {
  businessId: string;
  name: string;
  slug: string;
  avgRating: number;
  reviewCount: number;
  distanceM: number;
  suburb: string | null;
  city: string | null;
  lat: number;
  lng: number;
};

export type DiscoveryLocation = {
  position: LatLng;
  label: string;
  /** Named area slug when known — preferred for analytics over precise GPS */
  areaSlug?: string | null;
  source: "device" | "manual" | "search" | "default";
};

/**
 * MapsProvider — swappable map/geocode backend.
 * Rendering may use Leaflet/OSM tiles; geocoding may use Nominatim or a paid API.
 */
export interface MapsProvider {
  readonly id: string;
  readonly tileUrl: string;
  readonly attribution: string;
  readonly defaultCenter: LatLng;
  readonly defaultZoom: number;

  geocode(
    query: string,
    bias?: LatLng,
    options?: { exact?: boolean },
  ): Promise<GeocodeResult[]>;

  reverseGeocode(position: LatLng): Promise<ReverseGeocodeResult | null>;

  /** External directions (never stores route GPS) */
  getDirectionsUrl(input: {
    destination: LatLng;
    destinationLabel?: string;
    origin?: LatLng | null;
  }): string;
}
