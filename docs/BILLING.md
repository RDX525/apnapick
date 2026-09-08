# Billing & monetization

## Plans

| Code       | Role                                                             |
| ---------- | ---------------------------------------------------------------- |
| `free`     | Basic profile, products/services, basic analytics                |
| `premium`  | Enhanced profile, media, offers, advanced analytics, leads, team |
| `business` | Everything in Premium + **sponsored placement eligibility**      |

Organic search ranking is **never** influenced by plan or payment.

## Tables

| Table                  | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `plans`                | Catalog + `features` JSON + optional `external_price_id`           |
| `subscriptions`        | Business ↔ plan; status from webhooks                              |
| `subscription_events`  | Idempotent webhook ledger (`provider`, `provider_event_id` unique) |
| `payments`             | Payment rows (idempotent on provider + external id)                |
| `invoices`             | Stripe invoices                                                    |
| `sponsored_placements` | Paid slots — **separate** from organic ranking                     |

Migration: `supabase/migrations/0014_monetization.sql`.

## Stripe abstraction

- Interface: `src/integrations/payments/types.ts` (`PaymentProvider`)
- Live: `StripePaymentProvider`
- Local: `StubPaymentProvider` when `STRIPE_SECRET_KEY` is unset
- Factory: `getPaymentProvider()`

App code must not treat Checkout redirect as success.

## Source of truth

**Stripe webhooks** update subscription / payment / invoice state.

Endpoint: `POST /api/billing/webhooks/stripe`

1. Verify signature (`stripe-signature` or stub header)
2. Insert `subscription_events` — duplicate event id → ack without re-apply
3. Apply `customer.subscription.*`, `invoice.*`, etc.
4. `checkout.session.completed` only links customer ids — **does not** activate the plan

## APIs

| Route                                       | Notes                                               |
| ------------------------------------------- | --------------------------------------------------- |
| `GET /api/billing/plans`                    | Public catalog                                      |
| `POST /api/billing/checkout`                | Returns Checkout URL; `activationSource: "webhook"` |
| `POST /api/billing/portal`                  | Stripe Customer Portal                              |
| `GET /api/billing/subscription?businessId=` | Entitlements + subscription                         |

Dashboard: `/business/dashboard/subscription`.

## Entitlements

`getBusinessEntitlements(businessId)` / `assertBusinessEntitlement(businessId, feature)`.

Example gate: team invites require `teamMembers` (Premium+).

## Sponsored results

- Flag: `paidPlacementEnabled` (default **false**)
- Fetched via `listSponsoredResults` — not `RankingService`
- Exposed as `SearchResponse.sponsored`
- UI: `SponsoredResultCard` with clear **Sponsored** label

## Env

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PREMIUM=
STRIPE_PRICE_BUSINESS=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

Map Stripe Price IDs onto `plans.external_price_id` or the env vars above.
