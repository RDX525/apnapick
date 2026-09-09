# ApnaPick SEO

## Principle

SEO pages are **first-class** but never thin. Only index pages with meaningful real supply. Never generate thousands of empty facet URLs for crawl bait.

## URL patterns (lowercase)

```
/restaurants
/restaurants/pune
/restaurants/pune/indian
/restaurants/pune/indian/chicken-curry
/restaurants/pune/maharashtrian/misal-pav
/barbers
/barbers/pune
/barbers/pune/fade
/services
/services/pune/plumber
/cafes/pune/coffee/filter-coffee
```

Casing aliases (e.g. `/restaurants/Pune`) permanently redirect to the lowercase canonical.

Facet aliases (e.g. `north-indian` → `indian`) redirect to the preferred slug.

## Page types

| Path depth                          | Type                       | Example                                  |
| ----------------------------------- | -------------------------- | ---------------------------------------- |
| `/{category}`                       | `category`                 | `/restaurants`                           |
| `/{category}/{area}`                | `category_area`            | `/restaurants/pune`                      |
| `/{category}/{area}/{facet}`        | `category_area_facet`      | `/barbers/pune/fade`                     |
| `/{category}/{area}/{facet}/{item}` | `category_area_facet_item` | `/restaurants/pune/indian/chicken-curry` |
| `/areas/{slug}`                     | `area`                     | `/areas/kharadi`                         |
| `/b/{slug}`                         | `business`                 | `/b/spice-route-kitchen`                 |

Registry table: `seo_pages` (`path`, `page_type`, `indexable`, `canonical_path`, density metrics).

Taxonomy candidates live in `src/config/seo-taxonomy.ts`. Candidates are **not** guaranteed indexable URLs.

## Density gates (defaults)

Implemented in `src/config/seo-density.ts` (mirrors `seo_page_meets_density` in SQL):

| Page type               | Index if                                           |
| ----------------------- | -------------------------------------------------- |
| Category hub            | ≥ 8 published businesses                           |
| Category × area         | ≥ 5 published businesses                           |
| Category × area × facet | ≥ 3 businesses **and** ≥ 3 matching items/services |
| Facet × item            | ≥ 3 businesses **and** ≥ 3 matching items          |
| Area hub                | ≥ 5 published businesses                           |

Below threshold: page may still render as a utility hub with `noindex,follow`. Empty results never invent listings.

## On-page (every indexable page)

- Unique title + meta description
- Canonical URL
- HTML breadcrumbs + JSON-LD `BreadcrumbList`
- Useful intro copy
- Real businesses (from Supabase / empty state — never fabricated inventory)
- Relevant products / services / dishes when present
- Internal links to parent hubs and related facets
- Open Graph + Twitter cards
- Structured data where appropriate:
  - `Organization`
  - `LocalBusiness` / `Restaurant`
  - `Product`
  - `Service`
  - `ItemList`
  - `BreadcrumbList`

## Sitemap architecture

`app/sitemap.ts` uses `generateSitemaps` buckets:

| Bucket       | Contents                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| `core`       | Home + density-qualified `/areas/*`                                      |
| `hubs`       | Programmatic hubs that pass density **or** `seo_pages` where `indexable` |
| `businesses` | Published `/b/{slug}` only                                               |

Served as `/sitemap/core.xml`, `/sitemap/hubs.xml`, `/sitemap/businesses.xml` (plus sitemap index).

## Noindex rules

| Surface                                          | Rule                                 |
| ------------------------------------------------ | ------------------------------------ |
| Internal search (`/search` and query variations) | `noindex,nofollow` + robots disallow |
| Empty / insufficient-density hubs                | `noindex,follow`                     |
| Duplicate / alias combinations                   | redirect to canonical (not indexed)  |
| Private dashboards (`/business/dashboard/*`)     | `noindex` + robots disallow          |
| Admin (`/admin/*`)                               | `noindex` + robots disallow          |
| Onboarding (`/business/onboarding`)              | `noindex` + robots disallow          |
| Auth (`/login`, `/signup`)                       | robots disallow                      |
| APIs (`/api/*`)                                  | robots disallow                      |

## Code map

| Path                                     | Role                               |
| ---------------------------------------- | ---------------------------------- |
| `src/config/seo-taxonomy.ts`             | Category / facet / item candidates |
| `src/config/seo-density.ts`              | Indexability thresholds            |
| `src/domain/seo/types.ts`                | Hub domain model                   |
| `src/services/seo/hub-service.ts`        | Resolve hub + density              |
| `src/services/seo/sitemap-service.ts`    | Sitemap buckets                    |
| `src/repositories/seo/seo-repository.ts` | Businesses + catalog + `seo_pages` |
| `src/lib/seo/metadata.ts`                | Titles, canonical, robots          |
| `src/lib/seo/json-ld.ts`                 | Structured data builders           |
| `src/features/seo/*`                     | Hub page renderer                  |
| `src/app/[category]/...`                 | Nested programmatic routes         |

## Anti-patterns avoided

- Emitting every facet combination into the sitemap
- Indexing draft / suspended / deleted businesses
- Placeholder inventory for empty hubs
- Duplicate synonym paths without a canonical
- Trusting client-side flags for indexability
