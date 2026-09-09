# Geographic discovery

## MapsProvider

Abstraction in `src/domain/geo/types.ts`, default implementation `OsmMapsProvider`
(`src/integrations/maps/osm-provider.ts`):

- OSM tiles (Leaflet client)
- Nominatim geocode / reverse geocode with **area dictionary fallback**
- Directions URL (Google Maps) — no route GPS stored

Swap providers via `createMapsProvider()` / `getMapsProvider()`.

## Capabilities

| Feature           | How                                                      |
| ----------------- | -------------------------------------------------------- |
| Current location  | `navigator.geolocation` → session only + reverse geocode |
| Manual location   | Area chips (Kharadi, Wagholi, Lohegaon)                  |
| Location search   | `/api/geo/geocode`                                       |
| Reverse geocoding | `/api/geo/reverse`                                       |
| Map + markers     | Leaflet when `mapsEnabled`; projected fallback otherwise |
| Nearby            | PostGIS `nearby_businesses` via `/api/geo/nearby`        |
| Distance          | PostGIS `distance_meters` / search RPC `distance_m`      |
| Directions        | `/api/geo/directions` → external maps URL                |

## Map ↔ list sync

- Hover/focus a result → selects marker
- Click a marker → selects list row + scrolls into view
- Mobile: **List / Map** toggle

## Resilience

If Leaflet or tiles fail, `DiscoveryMapPanel` switches to `FallbackDiscoveryMap`.
Search list always works without a map.

## Privacy

- Precise coordinates live in **sessionStorage** only (`apnapick.geo.session.v1`)
- Analytics / search events keep **coarse area slug** only (`GeoSearchService.coarsenForAnalytics`)
- Do not write device GPS to durable storage

## Feature flag

`mapsEnabled` (default **true**). When false, UI uses the fallback map panel only; PostGIS nearby/search still run.

## API

- `GET /api/geo/nearby?lat=&lng=&radius_m=`
- `GET /api/geo/geocode?q=`
- `GET /api/geo/reverse?lat=&lng=`
- `GET /api/geo/coordinates?ids=`
- `GET /api/geo/directions?destLat=&destLng=`

## Migration

`0013_geo_discovery.sql` — extends `nearby_businesses` with lat/lng; adds `business_coordinates(uuid[])`.
