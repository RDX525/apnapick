# Reviews & trust

## Principles

- Authentication required for write actions (create, edit, delete, report, reply, moderate).
- Server-side Zod validation on every mutation.
- Duplicate reviews blocked (one review per user per business) — DB unique + service check.
- Rate limiting on all write endpoints.
- Abuse detection scores signals and may hold high-risk reviews as `PENDING`.
- Every mutation writes an audit log (`writeTrustAudit`).
- Rating aggregation is **server-controlled** from published, non-deleted reviews only.
- Verified badge requires `businesses.verified_at` — never claimed-only, never paid.
- Payment never manipulates rankings or reviews.

## User capabilities

| Action        | Endpoint                        |
| ------------- | ------------------------------- |
| Rate + review | `POST /api/reviews`             |
| Edit          | `PATCH /api/reviews/[id]`       |
| Delete (soft) | `DELETE /api/reviews/[id]`      |
| Report        | `POST /api/reviews/[id]/report` |

## Business owners

| Action | Endpoint                       |
| ------ | ------------------------------ |
| Reply  | `POST /api/reviews/[id]/reply` |

Owner identity checked via `business_members` role `OWNER` (or admin).

## Admins

| Action          | Endpoint                          |
| --------------- | --------------------------------- |
| Moderate status | `POST /api/reviews/[id]/moderate` |

Requires `requireAdminSession("admin:moderate")`.

## Aggregation & display

- `GET /api/reviews?businessId=` returns `{ summary, reviews, ownReview }`
- `summary`: `{ average, count, distribution: {1..5} }`
- Profile UI: rating, count, histogram, review list, composer
- Denormalized `businesses.avg_rating` / `review_count` kept by DB triggers

## Abuse architecture

`assessReviewAbuse` in `src/services/reviews/abuse.ts`:

- Signals: URLs, spam phrases, caps, rapid posting, short negative copy, promotional 5★
- Risk: low / medium / high
- High → `PENDING` (held for moderation), not silent delete
- Signals stored in audit `new_data`

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

| Path                          | Role                               |
| ----------------------------- | ---------------------------------- |
| `src/domain/reviews/types.ts` | Domain model                       |
| `src/validations/reviews.ts`  | Zod schemas                        |
| `src/services/reviews/*`      | Abuse, aggregation, audit, service |
| `src/repositories/reviews/*`  | Persistence                        |
| `src/app/api/reviews/**`      | HTTP API                           |
| `src/features/reviews/*`      | Consumer UI                        |
| `src/components/trust/*`      | Rating + verified badges           |
