# ApnaPick Database

PostgreSQL via Supabase with **PostGIS**. Initial market: **Pune, India** (`INR`, `Asia/Kolkata`).

## Conventions

| Rule        | Implementation                                                                   |
| ----------- | -------------------------------------------------------------------------------- |
| IDs         | `uuid` + `gen_random_uuid()`                                                     |
| Timestamps  | `created_at` / `updated_at` (`timestamptz`, UTC) + `set_updated_at` trigger      |
| Soft delete | `deleted_at` on businesses, products, services, photos, offers, reviews, ratings |
| Spatial     | `geography(Point\|MultiPolygon, 4326)` + **GiST** indexes                        |
| FTS         | `tsvector` + GIN; `pg_trgm` for fuzzy names                                      |
| Money       | `price_cents` + `currency` (`INR` default)                                       |

## Extensions

`postgis`, `pg_trgm`, `unaccent`, `citext` (schema `extensions`).

## Entity map

### Identity

| Entity   | Table / view                       | Notes                                                              |
| -------- | ---------------------------------- | ------------------------------------------------------------------ |
| Users    | `auth.users` + view `public.users` | Canonical auth; view joins `profiles`                              |
| Profiles | `profiles`                         | 1:1 with `auth.users`                                              |
| Roles    | `user_roles`                       | `USER`, `BUSINESS_OWNER`, `BUSINESS_STAFF`, `ADMIN`, `SUPER_ADMIN` |

### Business

`businesses`, `business_locations`, `business_members`, `business_claims`, `verification_events`, `business_hours`, `special_hours`, `photos`, `onboarding_drafts`, `business_categories`, `business_attributes`, `business_tags`

### Catalog

`categories`, `subcategories`, `products`, `services`, `menus`, `menu_categories`, `menu_items`, `attributes`, `tags`, `offers`

### Engagement

`reviews`, `ratings` (synced from reviews), `favorites`, `leads`, `notifications`, `reports`

### Search & analytics

`searches`, `search_events` (**no precise GPS by default**), `business_metrics_daily`

### Commerce (schema-ready)

`plans`, `subscriptions`, `payments`

### Platform

`geographic_areas`, `seo_pages`, `audit_logs`

## Status enums

**Business:** `DRAFT` → `PENDING_REVIEW` → `PUBLISHED` \| `REJECTED` \| `SUSPENDED` \| `MERGED`

**Claim:** `PENDING` → `UNDER_REVIEW` → `VERIFIED` \| `REJECTED` \| `EXPIRED`

## Uniqueness & indexes

- Unique published `businesses.slug`
- Unique `(normalized_name, primary_area_id)` among non-deleted
- One primary location / category / cover photo per business
- One active claim per (business, claimant)
- One review/rating per (business, user)
- GiST on `business_locations.geom`, `geographic_areas.geom|centroid`
- GIN on FTS documents + trigram name indexes

## Database functions

| Function                                           | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `nearby_businesses(lat,lng,radius_m,limit)`        | Published businesses by PostGIS distance  |
| `distance_meters(lat,lng,geom)`                    | Meter distance helper                     |
| `validate_business_ownership(business_id,user_id)` | OWNER (or admin) check                    |
| `validate_business_membership(...)`                | Member (or admin) check                   |
| `aggregate_business_rating(business_id)`           | Count / avg / Bayesian avg                |
| `refresh_business_rating(business_id)`             | Denormalize onto `businesses`             |
| `search_business_candidates(...)`                  | FTS + trgm + geo retrieval                |
| `business_is_open_now(...)`                        | Hours evaluation (`Asia/Kolkata` default) |
| `seo_page_meets_density(...)`                      | Indexability gate                         |

## Migrations

```
supabase/migrations/
  0001_extensions.sql
  0002_enums_and_profiles.sql
  0003_geography.sql
  0004_businesses.sql
  0005_catalog.sql
  0006_engagement.sql
  0007_search_analytics.sql
  0008_commerce_seo_audit.sql
  0009_rls.sql
  0010_search_functions.sql
  0011_phase2_ratings_users_geo.sql
```

## Seed (DEV ONLY)

- Path: `supabase/seed/pune_dev.sql`
- Enabled only for local CLI via `supabase/config.toml` `[db.seed]`
- Refuses when `app.environment=production`
- **Never** run against production

## RLS

Deny by default. See [SECURITY.md](./SECURITY.md) and [PHASE2.md](./PHASE2.md).

Tests: `supabase/tests/rls.test.sql`
