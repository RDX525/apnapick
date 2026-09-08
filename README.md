# ApnaPick

Intent-first local discovery platform for **Pune, India**.

## Current phase

**Phase 2 — Database** (complete). See [docs/PHASE2.md](docs/PHASE2.md).  
Phase 1 foundation: [docs/PHASE1.md](docs/PHASE1.md).

Business product features (onboarding UI, admin workflows) remain later phases; the **schema + RLS** are production-ready.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · Zod · Vitest · Playwright · Supabase-ready

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Docs

| Doc                                     | Topic                    |
| --------------------------------------- | ------------------------ |
| [PHASE1.md](docs/PHASE1.md)             | Foundation scope         |
| [PHASE2.md](docs/PHASE2.md)             | Database / RLS / PostGIS |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers & routes          |
| [DATABASE.md](docs/DATABASE.md)         | Schema reference         |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md)   | Env vars                 |
| [SECURITY.md](docs/SECURITY.md)         | Security model           |
| [TESTING.md](docs/TESTING.md)           | Test strategy            |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Deploy notes             |

## Structure

```
src/app components features domain services repositories lib hooks types validations config
```
