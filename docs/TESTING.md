# ApnaPick Testing

## Stack

- **Vitest** — unit/integration for domain + services
- **Playwright** — critical user journeys
- **ESLint / Prettier** — static quality
- **`tsc --noEmit`** — typecheck

## Scripts

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

## What we test first

### Unit

- `SearchParser` query fixtures (`best chicken curry near me`, etc.)
- `RankingService` weight math and paid-plan non-boost
- Completeness scoring
- Permission helpers

### E2E (when env available)

- Homepage search submit
- Results render
- Business profile
- Auth gate on dashboard
- Admin gate

## Database / RLS

```bash
supabase start
supabase db reset      # migrations + DEV seed only
supabase test db       # supabase/tests/rls.test.sql
```

DEV seed must never run in production.
