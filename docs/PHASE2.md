# Phase 2 — Database (PostgreSQL / Supabase / PostGIS)

Status: **complete**

## Delivered

- Full schema migrations `0001`–`0011` covering all Phase 2 entities
- PostGIS geography columns + GiST indexes
- RBAC helpers (`has_role`, `is_admin`, `is_super_admin`, membership/ownership)
- Deny-by-default RLS for USER / OWNER / STAFF / ADMIN / SUPER_ADMIN / public
- Functions: `nearby_businesses`, `distance_meters`, `validate_business_ownership`, `aggregate_business_rating`, `refresh_business_rating`, search candidates
- Local DEV seed (`supabase/seed/pune_dev.sql`) — **not for production**
- RLS smoke tests (`supabase/tests/rls.test.sql`)
- Docs: [DATABASE.md](./DATABASE.md), [SECURITY.md](./SECURITY.md)

## Apply locally

```bash
supabase start
supabase db reset   # runs migrations + DEV seed
supabase test db    # RLS / schema tests
```

## Production rules

1. Apply **migrations only** (never the Pune DEV seed).
2. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
3. Do not disable RLS.
4. Paid plans must never alter organic ranking weights (enforced in app; schema has no organic_boost write path for clients).
