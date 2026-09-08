import "server-only";

import { createMapsProvider } from "@/integrations/maps/osm-provider";
import type { MapsProvider } from "@/domain/geo/types";

let cached: MapsProvider | null = null;

export function getMapsProvider(): MapsProvider {
  if (!cached) cached = createMapsProvider();
  return cached;
}
