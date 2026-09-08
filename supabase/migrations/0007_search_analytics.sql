-- ApnaPick: search analytics + FTS documents on businesses / products / services

-- ---------------------------------------------------------------------------
-- Normalized search templates
-- ---------------------------------------------------------------------------

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null,
  query_hash text not null,
  intent text,
  category_slugs text[] not null default '{}',
  item_terms text[] not null default '{}',
  service_terms text[] not null default '{}',
  hit_count bigint not null default 0,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint searches_query_hash_unique unique (query_hash)
);

create trigger searches_set_updated_at
  before update on public.searches
  for each row
  execute function public.set_updated_at();

create index searches_normalized_query_trgm_idx
  on public.searches
  using gin (normalized_query extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Per-request analytics (no precise lat/lng by default — see SECURITY.md)
-- ---------------------------------------------------------------------------

create table public.search_events (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.searches (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  session_id text,
  raw_query text not null,
  normalized_query text not null,
  parsed jsonb not null default '{}'::jsonb,
  result_count integer not null default 0,
  coarse_area_id uuid references public.geographic_areas (id) on delete set null,
  coarse_area_slug text,
  radius_m integer,
  latency_ms integer,
  selected_business_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index search_events_created_at_idx on public.search_events (created_at desc);
create index search_events_search_id_idx on public.search_events (search_id);
create index search_events_user_id_idx on public.search_events (user_id);
create index search_events_coarse_area_id_idx on public.search_events (coarse_area_id);

comment on table public.search_events is 'Search analytics; precise GPS intentionally omitted by default.';

-- ---------------------------------------------------------------------------
-- Daily business metrics rollups
-- ---------------------------------------------------------------------------

create table public.business_metrics_daily (
  business_id uuid not null references public.businesses (id) on delete cascade,
  metric_date date not null,
  views integer not null default 0,
  search_impressions integer not null default 0,
  clicks integer not null default 0,
  calls integer not null default 0,
  direction_intents integer not null default 0,
  leads integer not null default 0,
  favorites integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, metric_date)
);

create trigger business_metrics_daily_set_updated_at
  before update on public.business_metrics_daily
  for each row
  execute function public.set_updated_at();

create index business_metrics_daily_date_idx
  on public.business_metrics_daily (metric_date desc);

-- ---------------------------------------------------------------------------
-- FTS: search_document columns + maintain triggers
-- ---------------------------------------------------------------------------

alter table public.businesses
  add column if not exists search_document tsvector;

alter table public.products
  add column if not exists search_document tsvector;

alter table public.services
  add column if not exists search_document tsvector;

create or replace function public.businesses_search_document(p_name text, p_description text)
returns tsvector
language sql
immutable
parallel safe
as $$
  select
    setweight(to_tsvector('public.english_unaccent', coalesce(p_name, '')), 'A')
    || setweight(to_tsvector('public.english_unaccent', coalesce(p_description, '')), 'B');
$$;

create or replace function public.item_search_document(p_name text, p_description text)
returns tsvector
language sql
immutable
parallel safe
as $$
  select
    setweight(to_tsvector('public.english_unaccent', coalesce(p_name, '')), 'A')
    || setweight(to_tsvector('public.english_unaccent', coalesce(p_description, '')), 'B');
$$;

create or replace function public.businesses_update_search_document()
returns trigger
language plpgsql
as $$
begin
  new.search_document := public.businesses_search_document(new.name, new.description);
  return new;
end;
$$;

create or replace function public.products_update_search_document()
returns trigger
language plpgsql
as $$
begin
  new.search_document := public.item_search_document(new.name, new.description);
  return new;
end;
$$;

create or replace function public.services_update_search_document()
returns trigger
language plpgsql
as $$
begin
  new.search_document := public.item_search_document(new.name, new.description);
  return new;
end;
$$;

create trigger businesses_search_document_trg
  before insert or update of name, description on public.businesses
  for each row
  execute function public.businesses_update_search_document();

create trigger products_search_document_trg
  before insert or update of name, description on public.products
  for each row
  execute function public.products_update_search_document();

create trigger services_search_document_trg
  before insert or update of name, description on public.services
  for each row
  execute function public.services_update_search_document();

-- Backfill any existing rows (safe on fresh migrate)
update public.businesses
set search_document = public.businesses_search_document(name, description)
where search_document is null;

update public.products
set search_document = public.item_search_document(name, description)
where search_document is null;

update public.services
set search_document = public.item_search_document(name, description)
where search_document is null;

create index businesses_search_document_gin
  on public.businesses
  using gin (search_document);

create index products_search_document_gin
  on public.products
  using gin (search_document);

create index services_search_document_gin
  on public.services
  using gin (search_document);
