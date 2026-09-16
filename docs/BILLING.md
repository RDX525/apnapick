# Billing & monetization

## Plans

| Code       | Role                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------- |
| `free`     | Basic profile, products/services, basic analytics                                             |
| `business` | Enhanced profile, media, offers, analytics, leads, team + **sponsored placement eligibility** |

Premium and Business were **combined** into a single paid `business` plan (₹499/mo). Legacy `premium` codes still normalize to `business` for existing subscriptions.

Organic search ranking is **never** influenced by plan or payment.

## Tables

| Table                  | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `plans`                | Catalog + `features` JSON + optional `external_price_id`           |
| `subscriptions`        | Business ↔ plan; status from webhooks                              |
| `subscription_events`  | Idempotent webhook ledger (`provider`, `provider_event_id` unique) |
| `payments`             | Payment rows (idempotent on provider + external id)                |
| `invoices`             | Razorpay invoices                                                  |
| `sponsored_placements` | Paid slots — **separate** from organic ranking                     |

Migration: `supabase/migrations/0014_monetization.sql`. Ledger apply status: `0016_launch_hardening.sql`. Combined plan: `0036_combine_premium_business_plan.sql`.

Checkout is currently **disabled** (`BILLING_CHECKOUT_ENABLED = false`). Dashboard copy is “coming soon”; `POST /api/billing/checkout` and `/portal` return 503.

## Razorpay abstraction

- Interface: `src/integrations/payments/types.ts` (`PaymentProvider`)
- Live: `RazorpayPaymentProvider`
- Local: `StubPaymentProvider` when `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are unset
- Factory: `getPaymentProvider()`

App code must not treat Checkout redirect as success.

## Source of truth

**Razorpay webhooks** update subscription / payment / invoice state.

Endpoint: `POST /api/billing/webhooks/razorpay`

1. Verify signature (`x-razorpay-signature` or stub header)
2. Insert `subscription_events` with `apply_status=pending`
3. Apply `subscription.*`, `payment.*`, `invoice.*`
4. Mark `applied` (or `failed` and return non-2xx so Razorpay retries)
5. Duplicate event ids retry apply unless status is already `applied` / `ignored`

Missing service role fails closed (503). Unknown plan/business refs do **not** fall back to a paid plan.

Razorpay has no hosted customer portal; `/api/billing/portal` returns the in-app subscription page.

## APIs

| Route                                       | Notes                                               |
| ------------------------------------------- | --------------------------------------------------- |
| `GET /api/billing/plans`                    | Public catalog                                      |
| `POST /api/billing/checkout`                | Returns hosted subscription URL; `activationSource: "webhook"` |
| `POST /api/billing/portal`                  | In-app billing management URL                       |
| `GET /api/billing/subscription?businessId=` | Entitlements + subscription                         |

Dashboard: `/business/dashboard/subscription`.

## Entitlements

`getBusinessEntitlements(businessId)` / `assertBusinessEntitlement(businessId, feature)`.

Example gate: team invites require `teamMembers` (Business plan).

## Sponsored results

- Flag: `paidPlacementEnabled` (default **false**)
- Fetched via `listSponsoredResults` — not `RankingService`
- Exposed as `SearchResponse.sponsored`
- UI: `SponsoredResultCard` with clear **Sponsored** label

## Env

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_BUSINESS=
RAZORPAY_PLAN_PREMIUM=   # optional legacy fallback for Business checkout
```

Map Razorpay Plan IDs onto `plans.external_price_id` or `RAZORPAY_PLAN_BUSINESS`.
