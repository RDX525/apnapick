# Reviews & trust

## Principles

- Authentication required for write actions (create, edit, delete, report, reply, moderate).
- Server-side Zod validation on every mutation.
- Duplicate reviews blocked (one review per user per business) — DB unique + service check.
- Rate limiting on all write endpoints.
- **Auto-publish** clean reviews; automated moderation holds suspicious ones as `PENDING`.
- Every mutation writes an audit log (`writeTrustAudit`).
- Ratings are aggregated server-side from published reviews only.
- Reviewer **email is private**: shown only to the signed-in author in the composer (“Signed in as …”). Public cards show `display_name` (or “ApnaPick member”), never email.
- If the profile has no public name, the author must set one before posting.
- Verified badge requires `businesses.verified_at` — never claimed-only, never paid.
- Payment never manipulates rankings or reviews.
- **Businesses cannot hide, delete, or unpublish reviews.** They may reply and report to ApnaPick. Only ApnaPick moderation can remove a review based on policy (DB trigger + admin APIs).
- **Author delete is permanent** (hard delete). After deleting, the author may post a new review for that business.

## Flow

1. User submits a review → publish immediately when risk is low.
2. Automated checks run at submit/edit time (spam, links, contact details, similar wording, rapid posting, soft related-account IP signal).
3. If suspicious → `PENDING` + `reviews.moderation` payload (signals + human-readable flags).
4. Admins act from `/admin/reviews`: **Approve** | **Reject** | **Request verification**.
5. Anyone can report a published review (`POST /api/reviews/[id]/report`).

## User capabilities

| Action        | Endpoint                        |
| ------------- | ------------------------------- |
| Rate + review | `POST /api/reviews`             |
| Edit          | `PATCH /api/reviews/[id]`       |
| Delete (permanent) | `DELETE /api/reviews/[id]`      |
| Report        | `POST /api/reviews/[id]/report` |

## Business owners

| Action | Endpoint                       |
| ------ | ------------------------------ |
| Reply  | `POST /api/reviews/[id]/reply` |
| Report | `POST /api/reviews/[id]/report` |

Owner identity checked via `business_members` role `OWNER` (or admin).

Owners **cannot** change `status` or `deleted_at` — enforced by `reviews_guard_owner_columns` (reply fields only). Removals are admin-only via moderation.

## Admins

| Action                 | Endpoint / UI                                      |
| ---------------------- | -------------------------------------------------- |
| Moderate               | `POST /api/reviews/[id]/moderate`                  |
| Queue                  | `/admin/reviews`                                   |

`moderate` body:

```json
{ "action": "approve" | "reject" | "request_verification", "note": "optional" }
```

Legacy `{ "status": "PUBLISHED" | "HIDDEN" | "REJECTED" | "PENDING" }` still accepted.

Requires `requireAdminSession("admin:moderate")`.

**Request verification** keeps the review `PENDING`, records the request on `reviews.moderation`, audits `review_verification_requested`, and notifies the author (`notifications.notification_type = MODERATION`).

## Aggregation & display

- `GET /api/reviews?businessId=` returns `{ summary, reviews, ownReview }`
- `summary`: `{ average, count, distribution: {1..5} }`
- Profile UI: rating, count, histogram, review list, composer
- Denormalized `businesses.avg_rating` / `review_count` kept by DB triggers
- Moderation metadata is **not** exposed on public review DTOs

## Abuse architecture

`assessReviewAbuse` in `src/services/reviews/abuse.ts`:

| Signal | Effect |
| ------ | ------ |
| URLs / excessive links | Flag; hold when promotional or multi-link |
| Spam phrases | Hold |
| Contact details (phone / email / WhatsApp / Telegram) | Hold |
| Similar wording vs recent reviews on the same business | Hold |
| Rapid posting (≥5 / 24h) | Hold |
| Related accounts (same IP, other actors, 7d) | Soft flag; hold only with another signal |
| Caps / repeated chars / short negative | Contribute to risk score |

- Risk: low / medium / high
- Hold → `PENDING` (never silent delete)
- Persisted on `reviews.moderation` (`risk`, `signals`, `flags`, verification fields)
- Also stored in audit `new_data`

Migration: `supabase/migrations/0032_review_moderation.sql`

## Rate limits (per user / hour)

| Action   | Limit |
| -------- | ----- |
| Create   | 5     |
| Update   | 20    |
| Delete   | 10    |
| Report   | 10    |
| Reply    | 30    |
| Moderate | 60    |

## Verified indicators

- **Verified** — `verified_at` set
- **Claimed** — `is_claimed` without verification (softer badge)

## Code map

| Path                                      | Role                               |
| ----------------------------------------- | ---------------------------------- |
| `src/domain/reviews/types.ts`             | Domain model                       |
| `src/validations/reviews.ts`              | Zod schemas                        |
| `src/services/reviews/*`                  | Abuse, aggregation, audit, service |
| `src/repositories/reviews/*`              | Persistence                        |
| `src/app/api/reviews/**`                  | HTTP API                           |
| `src/features/reviews/*`                  | Consumer UI                        |
| `src/features/admin/admin-reviews-page.tsx` | Admin queue                      |
| `src/components/trust/*`                  | Rating + verified badges           |
