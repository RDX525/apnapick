-- ApnaPick: commerce (schema-ready), SEO page registry, audit logs

-- ---------------------------------------------------------------------------
-- Plans / subscriptions / payments (no live processor in v1)
-- ---------------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency char(3) not null default 'INR',
  interval text not null default 'month', -- month | year
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint plans_code_unique unique (code)
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row
  execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'TRIALING',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  external_customer_id text,
  external_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

create index subscriptions_business_id_idx on public.subscriptions (business_id);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index subscriptions_status_idx on public.subscriptions (status);

create unique index subscriptions_one_active_uidx
  on public.subscriptions (business_id)
  where status in ('TRIALING', 'ACTIVE', 'PAST_DUE');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'INR',
  status public.payment_status not null default 'PENDING',
  provider text,
  external_payment_id text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger payments_set_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

create index payments_business_id_idx on public.payments (business_id);
create index payments_subscription_id_idx on public.payments (subscription_id);
create index payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------------
-- SEO pages (density-gated indexable registry)
-- ---------------------------------------------------------------------------

create table public.seo_pages (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  page_type public.seo_page_type not null,
  category_id uuid references public.categories (id) on delete cascade,
  area_id uuid references public.geographic_areas (id) on delete cascade,
  facet_slug text,
  title text not null,
  description text,
  canonical_path text not null,
  indexable boolean not null default false,
  business_count integer not null default 0 check (business_count >= 0),
  item_count integer not null default 0 check (item_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint seo_pages_path_unique unique (path),
  constraint seo_pages_canonical_not_blank check (length(trim(canonical_path)) > 0)
);

create trigger seo_pages_set_updated_at
  before update on public.seo_pages
  for each row
  execute function public.set_updated_at();

create index seo_pages_indexable_idx on public.seo_pages (indexable) where indexable;
create index seo_pages_page_type_idx on public.seo_pages (page_type);
create index seo_pages_category_id_idx on public.seo_pages (category_id);
create index seo_pages_area_id_idx on public.seo_pages (area_id);

comment on table public.seo_pages is 'Indexable page registry; only mark indexable when density gates pass.';

-- Density gate helper (defaults from SEO.md)
create or replace function public.seo_page_meets_density(
  p_page_type public.seo_page_type,
  p_business_count integer,
  p_item_count integer
)
returns boolean
language sql
immutable
parallel safe
as $$
  select case p_page_type
    when 'category' then p_business_count >= 8
    when 'category_area' then p_business_count >= 5
    when 'category_area_facet' then p_business_count >= 3 and p_item_count >= 3
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Audit logs
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_action_idx on public.audit_logs (action);

comment on table public.audit_logs is 'Critical mutations: claims, publish/suspend, roles, merges, admin overrides.';

-- Seed default free plan
insert into public.plans (code, name, description, price_cents, features, sort_order)
values (
  'free',
  'Free',
  'Standard listing — no organic ranking boost.',
  0,
  '{"organic_boost": false, "analytics": "basic"}'::jsonb,
  0
);
