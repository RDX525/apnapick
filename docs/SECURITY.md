# ApnaPick Security

## Principles

1. **Deny by default** — RLS enabled on all public tables; no policy ⇒ no access
2. **Never trust the client** for role, ownership, or claim state
3. **Secrets stay server-side** — `SUPABASE_SERVICE_ROLE_KEY` never in the browser
4. **Validate inputs** with Zod at action/API boundaries
5. **Audit privileged mutations** into `audit_logs`

## RBAC

Roles live in `user_roles` (`app_role` enum).

| Role               | Data access (RLS)                                                                     |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Public / anon**  | Published businesses + public catalog + published reviews/ratings only                |
| **USER**           | Own profile (write), own favorites/notifications/reports; create reviews/claims/leads |
| **BUSINESS_OWNER** | Full member write on owned businesses (via `business_members.role = OWNER`)           |
| **BUSINESS_STAFF** | Scoped by `business_members.permissions` JSON + membership                            |
| **ADMIN**          | Moderation / claims / taxonomy / SEO / reports (`is_admin()`)                         |
| **SUPER_ADMIN**    | Role grants including managing non-super roles; full admin                            |

Helpers (security definer):

- `has_role(role)`, `is_admin()`, `is_super_admin()`, `current_roles()`
- `is_business_member`, `is_business_owner`, `has_business_permission`
- `validate_business_ownership`, `validate_business_membership`
- `business_is_publicly_readable`

## Authorization layers

1. **Supabase RLS** — row visibility/writes
2. **App server checks** — `requirePermission` / `requireAdmin` in Next.js
3. **UI gating** — UX only

`service_role` bypasses RLS (Supabase design) — use only in trusted server contexts.

## Public vs private

| Public                                                                         | Private                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `PUBLISHED` businesses & locations/hours/photos/products/services/menus/offers | `DRAFT` / `PENDING_REVIEW` / `SUSPENDED` businesses  |
| Active taxonomy, indexable SEO metadata                                        | Claims, verification events, payments, subscriptions |
| Published reviews & ratings                                                    | Other users’ favorites, notifications, unread state  |
| Coarse search analytics inserts                                                | Search event read (own or admin), audit logs         |

## Location privacy

- Precise user GPS is **not** stored on `search_events` by default
- Optional `coarse_area_id` / `coarse_area_slug` only

## Uploads

Storage bucket `business-photos`: path prefix per `business_id`, JPEG/PNG/WebP/GIF magic-byte sniff on upload, bucket `file_size_limit` 5 MB and `allowed_mime_types` (migration `0029_business_photos_mime_size.sql`). Uploads use the signed-in member client — no service-role fallback.

## Rate limiting

`RATE_LIMIT_REDIS_URL` is required for multi-instance production (Vercel). The in-memory store is for single-process local use only. SSR `/search` shares the same limiter as `GET /api/search`.

## Headers

Next.js middleware: CSP, `X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy.

## Testing RLS

```bash
supabase db reset
supabase test db
```

See `supabase/tests/rls.test.sql`.

## Secrets

Never commit `.env.local`, service role keys, DB passwords, or payment credentials.
