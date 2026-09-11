# ApnaPick Deployment

## Platforms

- **App**: Vercel
- **Database / Auth / Storage**: Supabase

## Prerequisites

1. Supabase project with PostGIS enabled
2. Apply migrations in `supabase/migrations` (CLI or SQL editor order)
3. Run seed for non-production only
4. Storage bucket `business-photos` is created by migration `0027_owner_listing_media_hours.sql`. Create `verification-docs` if you collect claim documents.
5. Apply `0028_admin_accept_owner_edits.sql` so Accept owner edits publishes `PENDING_REVIEW` listings.
6. Configure Auth redirect URLs for Vercel domains

## Vercel

1. Import Git repository
2. Framework preset: Next.js
3. Set environment variables from [ENVIRONMENT.md](./ENVIRONMENT.md)
4. Deploy production from `main`

## Migration workflow

```bash
npx supabase db push   # or link + migration up
```

Never run destructive migrations against production without backup.

## Post-deploy checks

- `/api/health`
- Homepage renders
- `/search?q=best+coffee+near+me` returns 200
- Auth login/callback
- RLS: anon cannot read drafts
- Security headers present

## Rollback

- Vercel instant rollback to previous deployment
- DB: forward-fix migrations preferred; keep backups
