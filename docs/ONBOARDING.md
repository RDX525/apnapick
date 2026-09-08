# ApnaPick Business Onboarding & Claiming

## Goals

- First-class owner experience
- Save and resume (local + server drafts)
- Visible progress + weighted profile completeness
- Claim existing or create new
- Duplicate warnings (never auto-merge)
- Submit for approval with verification abstraction
- Owner/staff authorization with audited ownership changes

## Entry

Prominent **List your business** CTA (header + homepage owner section).

Owners can:

1. Register / log in (Supabase Auth when configured)
2. Continue with email/password (extensible to OAuth later)
3. Start or resume onboarding

## 9-step flow

| #   | Step              | Purpose                                                                                  |
| --- | ----------------- | ---------------------------------------------------------------------------------------- |
| 1   | Find business     | “Already listed?” search by name/phone/address/area → Claim or Create                    |
| 2   | Business info     | Name, description, category, subcategory, phone, email, website, price, attributes, tags |
| 3   | Location          | Country, state, city, suburb, postcode, address, lat/lng + map pin                       |
| 4   | Products/services | Products, dishes, services + restaurant menu tree                                        |
| 5   | Opening hours     | Weekly, split-ready fields, special/holiday hours, temporarily closed                    |
| 6   | Photos            | Logo, cover, gallery — type/size validation, progress, secure storage path               |
| 7   | Contact           | Phone, email, website, social, booking/order URLs                                        |
| 8   | Preview           | Public profile preview + edit shortcuts                                                  |
| 9   | Submit            | Completeness, missing items, verification status → approval                              |

## Save & resume

- Client: `localStorage` autosave (`apnapick.onboarding.draft.v1`)
- Server: `onboarding_drafts` via `PUT /api/business/drafts` when authenticated
- UI shows **“N% complete”** from weighted completeness

## Claim flow

States: `PENDING` → `UNDER_REVIEW` → `VERIFIED` | `REJECTED` | `EXPIRED`

API: `POST /api/business/claims`

Verification is abstracted (`src/integrations/verification/provider.ts`):

- `manual_admin` / `manual_document` / `admin_override` (v1)
- Placeholders: `email`, `phone`, `external_business`

Events: `verification_events`. Do not couple to one SMS/email vendor.

## Duplicate detection

Before create, check name similarity, phone, address, proximity, website.

Warn with “Claim this” actions. **Never auto-merge** without safeguards.

## Dashboard

`/business/dashboard` + sections:

Overview · Profile · Products · Services · Menu · Photos · Hours · Offers · Reviews · Leads · Analytics · Team · Settings

Shows completeness, verification, onboarding tasks, recommendations.

## Security

- `canManageBusiness` / `requireBusinessAccess` — owners always; staff only with assigned permissions; admins
- Mutations go through server APIs; RLS on `business_members`, `business_claims`, drafts
- Ownership changes written to `audit_logs`

## Key code

| Area         | Path                                             |
| ------------ | ------------------------------------------------ |
| Wizard       | `src/features/onboarding/onboarding-wizard.tsx`  |
| Completeness | `src/services/onboarding/completeness.ts`        |
| Duplicates   | `src/services/onboarding/duplicate-detection.ts` |
| Claims       | `src/services/claims/claim-service.ts`           |
| Ownership    | `src/services/business/ownership.ts`             |
| Verification | `src/integrations/verification/provider.ts`      |

## Completeness weights

| Group                  | Weight |
| ---------------------- | ------ |
| Name + category        | 15     |
| Location               | 15     |
| Hours                  | 10     |
| Photos (≥3)            | 15     |
| Description            | 10     |
| Contact                | 10     |
| Products/services (≥1) | 15     |
| Verified claim         | 10     |
