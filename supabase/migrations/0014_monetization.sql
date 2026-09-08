-- Monetization: plans enrichment, subscription_events, invoices, placements

-- ---------------------------------------------------------------------------
-- Extend plans for Stripe price mapping
-- ---------------------------------------------------------------------------

alter table public.plans
  add column if not exists external_price_id text,
  add column if not exists external_product_id text,
  add column if not exists trial_days integer not null default 0
    check (trial_days >= 0);

create unique index if not exists plans_external_price_id_uidx
  on public.plans (external_price_id)
  where external_price_id is not null;

-- Upsert FREE / PREMIUM / BUSINESS
insert into public.plans (code, name, description, price_cents, currency, interval, features, sort_order, is_active)
values
  (
    'free',
    'Free',
    'Basic listing for local discovery',
    0,
    'INR',
    'month',
    '{
      "basicProfile": true,
      "basicProducts": true,
      "basicServices": true,
      "basicAnalytics": true,
      "enhancedProfile": false,
      "additionalMedia": false,
      "offers": false,
      "advancedAnalytics": false,
      "leadManagement": false,
      "teamMembers": false,
      "maxTeamMembers": 1,
      "maxPhotos": 5,
      "maxProducts": 10,
      "maxServices": 10,
      "sponsoredEligible": false
    }'::jsonb,
    0,
    true
  ),
  (
    'premium',
    'Premium',
    'Enhanced profile, media, offers, leads, and team',
    199900,
    'INR',
    'month',
    '{
      "basicProfile": true,
      "basicProducts": true,
      "basicServices": true,
      "basicAnalytics": true,
      "enhancedProfile": true,
      "additionalMedia": true,
      "offers": true,
      "advancedAnalytics": true,
      "leadManagement": true,
      "teamMembers": true,
      "maxTeamMembers": 5,
      "maxPhotos": 40,
      "maxProducts": 100,
      "maxServices": 100,
      "sponsoredEligible": false
    }'::jsonb,
    10,
    true
  ),
  (
    'business',
    'Business',
    'Everything in Premium plus sponsored placement eligibility',
    499900,
    'INR',
    'month',
    '{
      "basicProfile": true,
      "basicProducts": true,
      "basicServices": true,
      "basicAnalytics": true,
      "enhancedProfile": true,
      "additionalMedia": true,
      "offers": true,
      "advancedAnalytics": true,
      "leadManagement": true,
      "teamMembers": true,
      "maxTeamMembers": 20,
      "maxPhotos": 120,
      "maxProducts": 500,
      "maxServices": 500,
      "sponsoredEligible": true
    }'::jsonb,
    20,
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

-- ---------------------------------------------------------------------------
-- subscription_events — webhook ledger (idempotent)
-- ---------------------------------------------------------------------------

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null,
  event_type text not null,
  business_id uuid references public.businesses (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint subscription_events_provider_event_unique unique (provider, provider_event_id)
);

create index subscription_events_business_id_idx
  on public.subscription_events (business_id);
create index subscription_events_subscription_id_idx
  on public.subscription_events (subscription_id);
create index subscription_events_event_type_idx
  on public.subscription_events (event_type);
create index subscription_events_created_at_idx
  on public.subscription_events (created_at desc);

comment on table public.subscription_events is
  'Idempotent billing webhook ledger. Provider event IDs are unique; Stripe is source of truth.';

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'INR',
  status text not null default 'open'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  provider text not null default 'stripe',
  external_invoice_id text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

create unique index invoices_external_invoice_id_uidx
  on public.invoices (provider, external_invoice_id)
  where external_invoice_id is not null;

create index invoices_business_id_idx on public.invoices (business_id);
create index invoices_subscription_id_idx on public.invoices (subscription_id);
create index invoices_status_idx on public.invoices (status);

-- Payment external id uniqueness for idempotent payment upserts
create unique index if not exists payments_provider_external_uidx
  on public.payments (provider, external_payment_id)
  where provider is not null and external_payment_id is not null;

create unique index if not exists subscriptions_external_subscription_uidx
  on public.subscriptions (external_subscription_id)
  where external_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- Sponsored placements — SEPARATE from organic ranking
-- ---------------------------------------------------------------------------

create table public.sponsored_placements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  query_terms text[] not null default '{}',
  area_slugs text[] not null default '{}',
  category_slugs text[] not null default '{}',
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  is_active boolean not null default true,
  label text not null default 'Sponsored',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger sponsored_placements_set_updated_at
  before update on public.sponsored_placements
  for each row
  execute function public.set_updated_at();

create index sponsored_placements_active_idx
  on public.sponsored_placements (is_active, starts_at, ends_at)
  where is_active;

create index sponsored_placements_business_id_idx
  on public.sponsored_placements (business_id);

comment on table public.sponsored_placements is
  'Paid placement inventory. Never mixed into organic ranking scores. Must be labeled in UI.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.subscription_events enable row level security;
alter table public.invoices enable row level security;
alter table public.sponsored_placements enable row level security;

create policy subscription_events_admin_read
  on public.subscription_events for select
  to authenticated
  using (public.is_admin());

create policy invoices_member_read
  on public.invoices for select
  to authenticated
  using (
    public.is_business_member(business_id)
    or public.is_admin()
  );

create policy invoices_admin_write
  on public.invoices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy sponsored_placements_public_read
  on public.sponsored_placements for select
  to anon, authenticated
  using (
    is_active
    and starts_at <= timezone('utc', now())
    and (ends_at is null or ends_at > timezone('utc', now()))
  );

create policy sponsored_placements_admin_write
  on public.sponsored_placements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
