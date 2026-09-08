import type { SeoDensityThresholds, SeoPageType } from "@/domain/seo/types";

/** Defaults aligned with docs/SEO.md — never index thin supply. */
export const SEO_DENSITY: SeoDensityThresholds = {
  category: 8,
  categoryArea: 5,
  categoryAreaFacet: { businesses: 3, items: 3 },
  categoryAreaFacetItem: { businesses: 3, items: 3 },
  area: 5,
};

export function seoPageMeetsDensity(
  pageType: SeoPageType,
  businessCount: number,
  itemCount = 0,
  thresholds: SeoDensityThresholds = SEO_DENSITY,
): boolean {
  switch (pageType) {
    case "category":
      return businessCount >= thresholds.category;
    case "category_area":
      return businessCount >= thresholds.categoryArea;
    case "category_area_facet":
      return (
        businessCount >= thresholds.categoryAreaFacet.businesses &&
        itemCount >= thresholds.categoryAreaFacet.items
      );
    case "category_area_facet_item":
      return (
        businessCount >= thresholds.categoryAreaFacetItem.businesses &&
        itemCount >= thresholds.categoryAreaFacetItem.items
      );
    case "area":
      return businessCount >= thresholds.area;
    case "business":
      return businessCount >= 1;
    default:
      return false;
  }
}

export function noIndexReasonForDensity(
  pageType: SeoPageType,
  businessCount: number,
  itemCount = 0,
): string | null {
  if (seoPageMeetsDensity(pageType, businessCount, itemCount)) return null;
  if (businessCount === 0) return "empty_results";
  return "insufficient_density";
}
