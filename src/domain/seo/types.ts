import type { ConsumerBusinessCard } from "@/domain/consumer/types";

/** DB enum subset + app-level depth for dish/item hubs */
export type SeoPageType =
  | "category"
  | "category_area"
  | "category_area_facet"
  | "category_area_facet_item"
  | "area"
  | "business";

export type SeoBreadcrumb = {
  name: string;
  path: string;
};

export type SeoRelatedLink = {
  label: string;
  path: string;
};

export type SeoCatalogItem = {
  name: string;
  slug: string;
  path: string;
  kind: "product" | "service" | "dish" | "facet";
};

export type SeoHubPage = {
  path: string;
  canonicalPath: string;
  pageType: SeoPageType;
  categorySlug: string;
  categoryName: string;
  areaSlug: string | null;
  areaName: string | null;
  facetSlug: string | null;
  facetName: string | null;
  itemSlug: string | null;
  itemName: string | null;
  title: string;
  description: string;
  h1: string;
  intro: string;
  indexable: boolean;
  noIndexReason: string | null;
  businessCount: number;
  itemCount: number;
  businesses: ConsumerBusinessCard[];
  catalogItems: SeoCatalogItem[];
  breadcrumbs: SeoBreadcrumb[];
  relatedLinks: SeoRelatedLink[];
  schemaKind: "restaurant" | "local_business" | "service" | "mixed";
};

export type SeoDensityThresholds = {
  category: number;
  categoryArea: number;
  categoryAreaFacet: { businesses: number; items: number };
  categoryAreaFacetItem: { businesses: number; items: number };
  area: number;
};
