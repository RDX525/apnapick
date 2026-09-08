# Phase 1 — Production Foundation

Status: **complete** (tooling + architecture + shared UI + runtime shell).

Initial market: **Pune, Maharashtra, India**.

## Goals

Ship a production-grade application shell without product business features.

## Delivered

| Area                                                               | Status |
| ------------------------------------------------------------------ | ------ |
| Next.js App Router + TypeScript strict                             | Done   |
| Tailwind CSS 4 + shadcn/ui                                         | Done   |
| ESLint + Prettier + Vitest + Playwright                            | Done   |
| Public vs server env validation (Zod)                              | Done   |
| Logging abstraction                                                | Done   |
| Analytics abstraction                                              | Done   |
| Rate-limiting abstraction                                          | Done   |
| Feature flags                                                      | Done   |
| API/service architecture (`services/`, `repositories/`, `domain/`) | Done   |
| Global error / loading / not-found                                 | Done   |
| Security headers (middleware)                                      | Done   |
| Metadata + sitemap + robots foundations                            | Done   |
| Reusable UI primitives + Empty/Error/Loading states                | Done   |

## Structure

```
src/
  app/             # Routes, error/loading/not-found, API
  components/      # UI primitives + layout + states
  features/        # Feature UI (thin) — product flows later
  domain/          # Pure types & domain rules
  services/        # Application services
  repositories/    # Data access
  lib/             # Cross-cutting (auth, db, logging, security, seo)
  hooks/           # Client hooks
  types/           # Shared TS types
  validations/     # Zod schemas
  config/          # Env, app config, feature flags
```

## Explicitly out of Phase 1

- Full business onboarding / claim / verify / publish
- Admin moderation workflows
- Live Supabase Auth session UX
- Map provider integration
- Payments / subscriptions
- Production analytics vendor wiring

Scaffold routes that exist from earlier exploration may remain, but feature flags keep product surfaces off by default where gated.

## Verify

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
