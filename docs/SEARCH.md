# ApnaPick Search Engine

## Goal

Understand what the user **wants**, not only business names.

### Example

Input: `best chicken curry near me`

Parsed intent:

```json
{
  "item": "chicken curry",
  "category": "restaurant",
  "location": "current",
  "intent": "discovery",
  "qualityPreference": "best"
}
```

Internal pipeline still uses richer `ParsedSearchQuery` (category slugs, expanded synonyms, attributes, price, open-now, etc.). Clients receive both `intent` (compact) and `query` (full).

## Architecture (replaceable)

```
Frontend /api/search
        │
        ▼
   SearchService          # Stable orchestrator — do not bypass from UI
        │
        ├── SearchParser
        ├── SearchEngine (interface)
        │     ├── PostgresSearchRepository   # default: FTS + pg_trgm + PostGIS
        │     ├── EmptySearchRepository      # no inventing listings
        │     └── (future) Typesense / ES / Algolia adapter
        ├── GeoSearchService
        ├── RankingService
        └── SearchAnalyticsService
```

Swap engines by changing `createSearchEngine()` in `src/services/search/get-search-service.ts`.  
`SearchService` request/response contracts and the frontend stay unchanged.

## Components

| Component                           | Responsibility                                             |
| ----------------------------------- | ---------------------------------------------------------- |
| **SearchService**                   | Parse → retrieve → filter → rank → sort → page → analytics |
| **SearchParser**                    | Rule + lexicon NLP-lite understanding + synonym expansion  |
| **SearchRepository / SearchEngine** | Candidate retrieval                                        |
| **GeoSearchService**                | Radius, named areas, privacy-safe coarse location          |
| **RankingService**                  | Configurable multi-signal scoring                          |
| **SearchAnalyticsService**          | Anonymous events, clicks, actions                          |

## Matching support

| Capability        | How                                                        |
| ----------------- | ---------------------------------------------------------- |
| Exact             | Product/service name equality + FTS phrase                 |
| Partial           | Token overlap / `ILIKE` / FTS                              |
| Fuzzy             | `pg_trgm` similarity (`%` / `similarity()`)                |
| Synonyms          | `domain/catalog/synonyms.ts` expanded into retrieval query |
| Categories        | Lexicon + `business_categories` filter                     |
| Products / dishes | `products.search_document` + trigram                       |
| Services          | `services.search_document` + service term filter           |
| Tags / attributes | Attribute keys on businesses                               |
| Locations         | PostGIS `ST_DWithin` + named suburb dictionary             |
| Open now          | `business_is_open_now()`                                   |
| Price             | `price_level` + cheap/moderate/premium parse               |
| Rating            | `min_rating` filter + Bayesian rating in rank              |

## Retrieval (PostgreSQL)

Migration `0010` + `0012`:

1. **Full-text** — `websearch_to_tsquery('english_unaccent')` against business/product/service `tsvector`s
2. **pg_trgm** — short / typo queries via `similarity` and `%`
3. **PostGIS** — `ST_DWithin` / `ST_Distance` when lat/lng present
4. Filters pushed down: category, attributes, min rating, price levels, open now, offers, service terms

RPC: `search_business_candidates(...)` returns **candidates with retrieval scores**.  
Final ordering is always app-side `RankingService` (except explicit user sorts).

## Ranking

**Do not sort by rating alone.**

Score ≈ weighted sum of:

| Factor             | Default weight | Notes                          |
| ------------------ | -------------- | ------------------------------ |
| Query relevance    | 0.30           | FTS / trgm / blended relevance |
| Item/service match | 0.18           | Explicit product/service hit   |
| Distance           | 0.16           | Decay vs radius                |
| Rating             | 0.12           | Bayesian average               |
| Review volume      | 0.08           | Log-scaled                     |
| Completeness       | 0.06           | Profile 0–100 → 0–1            |
| Popularity         | 0.05           | Recent metrics rollup          |
| Freshness          | 0.03           | Recent profile updates         |
| Availability       | 0.02           | Open-now alignment             |
| Trust              | 0.05           | Claimed / verified             |

Weights: `src/domain/ranking/weights.ts`  
Override with env `SEARCH_RANKING_WEIGHTS` (JSON partial merge).

**Paid plans never boost organic score.** Sponsored results (future) are a separate, labeled list.

## Filters

API / `SearchFilters`:

- `distance` / `radius_m`
- `min_rating`
- `price` (levels 1–4)
- `open_now`
- `category`
- `attributes`
- `services`
- `has_offers`

## Sorting

| UI label      | `sort` param                           |
| ------------- | -------------------------------------- |
| Recommended   | `recommended` (default) or `relevance` |
| Distance      | `distance`                             |
| Rating        | `rating`                               |
| Most reviewed | `reviews`                              |

Recommended = multi-signal ranking. Other sorts re-order after ranking.

## Analytics (privacy)

Persisted (when Supabase is configured):

- normalized query + parsed facets
- coarse area slug (suburb/city) — **not** precise GPS
- filters / sort
- result count + latency
- business clicked (`search_events.selected_business_ids`, `search_actions`)
- action taken: `click` \| `call` \| `directions` \| `website` \| `save` \| `share`

Endpoints:

- `GET /api/search?...`
- `POST /api/search/action` — `{ businessId, action, searchEventId?, areaSlug? }`

## API

```
GET /api/search
  ?q=
  &lat=&lng=          # optional; used for distance only
  &area=              # coarse area slug
  &radius_m=
  &sort=recommended|distance|rating|reviews
  &open_now=1
  &min_rating=4
  &price=1,2
  &category=restaurants
  &attributes=vegetarian
  &services=fade
  &has_offers=1
  &page=&page_size=
  &session_id=
```

Validated with Zod. Rate-limited per IP.

## Latency budget

| Stage     | Target             |
| --------- | ------------------ |
| Parse     | < 5ms              |
| Retrieve  | < 120ms p95        |
| Rank      | < 20ms             |
| Total API | < 200ms p95 (warm) |

## Production safety

- Without Supabase config → empty results (never invent listings).
- Demo/`InMemorySearchRepository` is for **unit tests only**.
- Organic ranking code paths must not import subscription / payment fields.
