# ApnaPick Architecture

## Product thesis

ApnaPick is an **intent-first local discovery platform**, not a business directory.

Core consumer loop:

```
USER INTENT → LOCATION → SEARCH UNDERSTANDING → MATCH → RANK → ACTION
```

Core business loop:

```
OWNER → REGISTER → FIND/CREATE → CLAIM → VERIFY → COMPLETE → PUBLISH → MANAGE → ANALYZE
```

Initial market: **Pune, Maharashtra, India**. Schema and services are market-agnostic for global expansion via `geographic_areas`.

## Stack

| Layer      | Choice                                     |
| ---------- | ------------------------------------------ |
| App        | Next.js 16 (App Router), TypeScript strict |
| UI         | Tailwind CSS 4, shadcn/ui, Framer Motion   |
| Data       | Supabase PostgreSQL + PostGIS              |
| Auth       | Supabase Auth + server-side RBAC           |
| Payments   | Razorpay (webhooks source of truth)        |
| Storage    | Supabase Storage                           |
| Validation | Zod                                        |
| Forms      | React Hook Form                            |
| Hosting    | Vercel                                     |
| Tests      | Vitest (unit), Playwright (e2e)            |

## Layered modules

```
src/
  app/                  # Routes only — thin
  components/           # Shared UI primitives + composed presentational pieces
  features/             # Feature-scoped UI + feature actions (thin)
  domain/               # Pure domain types, enums, ranking models
  services/             # Application services (search, ranking, onboarding, …)
  repositories/         # Data access (Postgres/Supabase)
  lib/
    auth/               # Session, roles, permission checks
    db/                 # Supabase clients
    security/           # Rate limit, sanitization, headers
    seo/                # Metadata, JSON-LD, sitemap helpers
    geo/                # Geo helpers (client + server contracts)
    validations/        # Zod schemas
  integrations/         # External providers (verification, payments later)
```

### Rules

1. **Server Components by default.** Client components only for interactivity (search box, map, forms, geolocation).
2. **No large business logic in components.** Components call services/actions; services own rules.
3. **Repositories own SQL.** Services never embed raw query strings except via repository methods.
4. **Authorization is server-side.** UI may hide controls; RLS + `requirePermission` enforce reality.
5. **Search is an abstraction.** `SearchService` can swap Postgres FTS for an external engine later.

## Feature boundaries

| Feature      | Owns                                  | Does not own                 |
| ------------ | ------------------------------------- | ---------------------------- |
| `search`     | Parse → retrieve → rank → analytics   | Business CRUD                |
| `businesses` | Profiles, locations, hours, photos    | Claim verification providers |
| `onboarding` | Save/resume wizard, completeness      | Admin approval UI            |
| `claims`     | Claim lifecycle + verification events | Payment                      |
| `catalog`    | Products, services, menus             | SEO page generation          |
| `reviews`    | Ratings/reviews moderation hooks      | Ranking weights              |
| `dashboard`  | Owner analytics surfaces              | Search ranking               |
| `admin`      | Moderation, merge, SEO ops            | Consumer UX                  |
| `seo`        | Indexable page eligibility, metadata  | Content authoring            |

## Route map

### Consumer

| Route                        | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `/`                          | Homepage discovery                       |
| `/search`                    | Intent search results + map              |
| `/b/[slug]`                  | Business profile                         |
| `/[category]`                | SEO category hub (gated by data density) |
| `/[category]/[area]`         | Category × area                          |
| `/[category]/[area]/[facet]` | Category × area × cuisine/item (gated)   |
| `/areas/[slug]`              | Area landing                             |
| `/login`, `/signup`          | Auth                                     |
| `/favorites`                 | Saved businesses (auth)                  |

### Business

| Route                              | Purpose                 |
| ---------------------------------- | ----------------------- |
| `/business/onboarding`             | Multi-step save/resume  |
| `/business/dashboard`              | Overview + completeness |
| `/business/dashboard/profile`      | Profile edit            |
| `/business/dashboard/products`     | Products/items          |
| `/business/dashboard/services`     | Services                |
| `/business/dashboard/menu`         | Menu                    |
| `/business/dashboard/photos`       | Photos                  |
| `/business/dashboard/hours`        | Hours                   |
| `/business/dashboard/offers`       | Offers                  |
| `/business/dashboard/reviews`      | Reviews                 |
| `/business/dashboard/leads`        | Leads                   |
| `/business/dashboard/analytics`    | Metrics                 |
| `/business/dashboard/team`         | Members                 |
| `/business/dashboard/settings`     | Settings                |
| `/business/dashboard/subscription` | Plan                    |

### Admin

| Route                  | Purpose                   |
| ---------------------- | ------------------------- |
| `/admin`               | Ops dashboard             |
| `/admin/businesses`    | Approve / suspend / merge |
| `/admin/claims`        | Claim review              |
| `/admin/users`         | Users/roles               |
| `/admin/categories`    | Taxonomy                  |
| `/admin/reviews`       | Moderation                |
| `/admin/reports`       | Reports                   |
| `/admin/search`        | Search analytics          |
| `/admin/seo`           | SEO page registry         |
| `/admin/subscriptions` | Plans                     |
| `/admin/audit`         | Audit logs                |
| `/admin/settings`      | Platform settings         |

### API

| Route              | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `/api/search`      | Search (rate-limited, including SSR `/search`) |
| `/api/billing/webhooks/razorpay` | Razorpay billing webhooks     |
| `/api/health`      | Liveness + Supabase ping (no feature flags) |

Server Actions are preferred for mutations; route handlers for search and public JSON.

## Request flow (search)

```
UI SearchBox
  → GET /api/search | server action
    → rateLimit
    → SearchParser.parse(query, locationContext)
    → SearchRepository.retrieve(parsed)
    → GeoSearchService.filterByDistance
    → RankingService.rank(candidates, weights)
    → SearchAnalyticsService.record
    → DTO → UI
```

## Architectural risks

| Risk                          | Mitigation                                                            |
| ----------------------------- | --------------------------------------------------------------------- |
| Thin SEO pages at scale       | Density gates + `seo_pages` registry; only index approved pages       |
| Precise location privacy      | Ephemeral session location; never persist lat/lng unless user opts in |
| Paid bias in organic rank     | Separate sponsored slots; organic weights exclude payment status      |
| Duplicate businesses          | Normalized name+geo uniqueness helpers + admin merge                  |
| RLS gaps                      | Deny-by-default policies; service role only on server                 |
| Search quality with FTS alone | Parser + trigram + item matching; engine-swappable repository         |
| Giant onboarding forms        | Wizard steps + draft JSON + completeness service                      |
| Vercel + PostGIS latency      | Indexed geo queries, pagination, edge caching for SEO hubs            |

## Phased delivery

1. Foundation (scaffold, docs, schema, RLS, auth)
2. Search + ranking + consumer discovery
3. Business onboarding + claim + dashboard
4. Admin + SEO density + analytics
5. Hardening (tests, perf, headers, rate limits)

## Non-goals (v1)

- External search engine (Elastic/Typesense) — interface ready
- SMS verification provider — abstraction + manual/admin path
- Multi-language UI
