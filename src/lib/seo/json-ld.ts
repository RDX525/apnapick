import type { ConsumerBusinessProfile } from "@/domain/consumer/types";
import type { SeoBreadcrumb, SeoHubPage } from "@/domain/seo/types";
import { getPublicEnv } from "@/config/env";
import { escapeJsonForScript } from "@/lib/security/sanitize";

function absolute(path: string) {
  const { NEXT_PUBLIC_APP_URL: base } = getPublicEnv();
  return new URL(path.startsWith("/") ? path : `/${path}`, base).toString();
}

export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: escapeJsonForScript(data),
  };
}

export function organizationJsonLd() {
  const { NEXT_PUBLIC_APP_URL: base, NEXT_PUBLIC_APP_NAME: name } = getPublicEnv();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: name ?? "ApnaPick",
    url: base,
    logo: `${base}/icon`,
    areaServed: {
      "@type": "City",
      name: "Pune",
      containedInPlace: {
        "@type": "State",
        name: "Maharashtra",
      },
    },
  };
}

export function breadcrumbListJsonLd(crumbs: SeoBreadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absolute(c.path),
    })),
  };
}

export function itemListJsonLd(hub: SeoHubPage, options?: { name?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: options?.name ?? hub.title,
    numberOfItems: hub.businesses.length,
    itemListElement: hub.businesses.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absolute(`/b/${b.slug}`),
      name: b.name,
    })),
  };
}

export function localBusinessJsonLd(
  business: ConsumerBusinessProfile,
  options?: { asRestaurant?: boolean },
) {
  const type =
    options?.asRestaurant || business.categorySlugs?.includes("restaurants")
      ? "Restaurant"
      : business.categorySlugs?.some((s) =>
            ["plumbers", "electricians", "services"].includes(s),
          )
        ? "Service"
        : "LocalBusiness";

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": type === "Service" ? "LocalBusiness" : type,
    name: business.name,
    description: business.description,
    url: absolute(`/b/${business.slug}`),
    telephone: business.phone,
    image: business.coverImageUrl ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.addressLine1,
      addressLocality: business.suburb ?? business.city ?? "Pune",
      addressRegion: "Maharashtra",
      postalCode: business.postcode,
      addressCountry: "IN",
    },
  };

  if (business.reviewCount > 0) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: business.avgRating,
      reviewCount: business.reviewCount,
    };
  }

  if (type === "Service" && business.services[0]) {
    base.makesOffer = business.services.slice(0, 8).map((s) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s.name,
        description: s.description,
      },
    }));
  }

  if (business.products.length > 0) {
    base.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Products",
      itemListElement: business.products.slice(0, 12).map((p) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: p.name,
          description: p.description,
        },
      })),
    };
  }

  return base;
}

export function productJsonLd(input: {
  name: string;
  description?: string | null;
  businessName: string;
  businessPath: string;
  priceCents?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description ?? undefined,
    brand: {
      "@type": "Brand",
      name: input.businessName,
    },
    offers:
      input.priceCents != null
        ? {
            "@type": "Offer",
            priceCurrency: "INR",
            price: (input.priceCents / 100).toFixed(2),
            availability: "https://schema.org/InStock",
            url: absolute(input.businessPath),
          }
        : undefined,
  };
}

export function serviceJsonLd(input: {
  name: string;
  description?: string | null;
  providerName: string;
  providerPath: string;
  areaName?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description ?? undefined,
    provider: {
      "@type": "LocalBusiness",
      name: input.providerName,
      url: absolute(input.providerPath),
    },
    areaServed: input.areaName
      ? { "@type": "Place", name: input.areaName }
      : { "@type": "City", name: "Pune" },
  };
}

export function hubStructuredData(hub: SeoHubPage) {
  const graph: Record<string, unknown>[] = [
    organizationJsonLd(),
    breadcrumbListJsonLd(hub.breadcrumbs),
  ];

  if (hub.businesses.length > 0) {
    graph.push(itemListJsonLd(hub));
  }

  if (hub.schemaKind === "service" && hub.facetName) {
    graph.push(
      serviceJsonLd({
        name: hub.itemName ?? hub.facetName,
        description: hub.description,
        providerName: "ApnaPick",
        providerPath: hub.canonicalPath,
        areaName: hub.areaName,
      }),
    );
  }

  if (
    (hub.schemaKind === "restaurant" || hub.pageType === "category_area_facet_item") &&
    hub.itemName
  ) {
    graph.push(
      productJsonLd({
        name: hub.itemName,
        description: hub.description,
        businessName: "ApnaPick",
        businessPath: hub.canonicalPath,
      }),
    );
  }

  return graph;
}
