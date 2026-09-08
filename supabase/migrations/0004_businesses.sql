-- ApnaPick: businesses core — locations, members, claims, hours, photos, drafts, membership helpers

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  slug text not null,
  description text,
  status public.business_status not null default 'DRAFT',
  primary_area_id uuid references public.geographic_areas (id) on delete set null,
  phone text,
  email extensions.citext,
  website text,
  price_level smallint check (price_level between 1 and 4),
  completeness smallint not null default 0 check (completeness between 0 and 100),
  avg_rating numeric(3, 2) not null default 0 check (avg_rating >= 0 and avg_rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  is_claimed boolean not null default false,
  verified_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  merged_into_id uuid references public.businesses (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint businesses_name_not_blank check (length(trim(name)) > 0),
  constraint businesses_slug_not_blank check (length(trim(slug)) > 0)
);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row
  execute function public.set_updated_at();

-- Normalize name on write
create or replace function public.normalize_business_name(raw text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(trim(regexp_replace(public.immutable_unaccent(coalesce(raw, '')), '\s+', ' ', 'g')));
$$;

create or replace function public.businesses_set_normalized_name()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name := public.normalize_business_name(new.name);
  return new;
end;
$$;

create trigger businesses_set_normalized_name
  before insert or update of name on public.businesses
  for each row
  execute function public.businesses_set_normalized_name();

-- Duplicate prevention / published slug uniqueness
create unique index businesses_published_slug_uidx
  on public.businesses (slug)
  where status = 'PUBLISHED' and deleted_at is null;

create unique index businesses_normalized_name_area_uidx
  on public.businesses (normalized_name, primary_area_id)
  where deleted_at is null and primary_area_id is not null;

create index businesses_status_idx on public.businesses (status) where deleted_at is null;
create index businesses_primary_area_id_idx on public.businesses (primary_area_id) where deleted_at is null;
create index businesses_created_by_idx on public.businesses (created_by);
create index businesses_name_trgm_idx
  on public.businesses
  using gin (name extensions.gin_trgm_ops);

comment on table public.businesses is 'Canonical local businesses; soft-deleted via deleted_at.';

-- ---------------------------------------------------------------------------
-- business_locations
-- ---------------------------------------------------------------------------

create table public.business_locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  label text,
  address_line1 text not null,
  address_line2 text,
  suburb text,
  city text,
  postcode text,
  country_code char(2) not null default 'IN',
  geom extensions.geography(Point, 4326) not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger business_locations_set_updated_at
  before update on public.business_locations
  for each row
  execute function public.set_updated_at();

create index business_locations_geom_gix
  on public.business_locations
  using gist (geom);

create index business_locations_business_id_idx
  on public.business_locations (business_id);

-- At most one primary location per business
create unique index business_locations_one_primary_uidx
  on public.business_locations (business_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- business_members
-- ---------------------------------------------------------------------------

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.business_member_role not null default 'STAFF',
  permissions jsonb not null default '{"manage_profile": true}'::jsonb,
  invited_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_members_unique unique (business_id, user_id)
);

create trigger business_members_set_updated_at
  before update on public.business_members
  for each row
  execute function public.set_updated_at();

create index business_members_user_id_idx on public.business_members (user_id);
create index business_members_business_id_idx on public.business_members (business_id);

-- Membership helpers for RLS
create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.role = 'OWNER'
  );
$$;

create or replace function public.has_business_permission(p_business_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and (
        bm.role = 'OWNER'
        or coalesce((bm.permissions ->> p_permission)::boolean, false)
      )
  );
$$;

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.is_business_owner(uuid) from public;
revoke all on function public.has_business_permission(uuid, text) from public;
grant execute on function public.is_business_member(uuid) to authenticated, service_role;
grant execute on function public.is_business_owner(uuid) to authenticated, service_role;
grant execute on function public.has_business_permission(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- business_claims
-- ---------------------------------------------------------------------------

create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  claimant_id uuid not null references public.profiles (id) on delete cascade,
  status public.claim_status not null default 'PENDING',
  evidence jsonb not null default '{}'::jsonb,
  notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger business_claims_set_updated_at
  before update on public.business_claims
  for each row
  execute function public.set_updated_at();

create index business_claims_business_id_idx on public.business_claims (business_id);
create index business_claims_claimant_id_idx on public.business_claims (claimant_id);
create index business_claims_status_idx on public.business_claims (status);

-- One active claim per claimant/business
create unique index business_claims_active_uidx
  on public.business_claims (business_id, claimant_id)
  where status in ('PENDING', 'UNDER_REVIEW');

-- ---------------------------------------------------------------------------
-- verification_events (provider-agnostic audit trail)
-- ---------------------------------------------------------------------------

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.business_claims (id) on delete cascade,
  provider text not null,
  event_type text not null,
  external_session_id text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index verification_events_claim_id_idx on public.verification_events (claim_id);
create index verification_events_provider_idx on public.verification_events (provider);

comment on table public.verification_events is 'Immutable-ish verification provider events (manual_document, admin_override, …).';

-- ---------------------------------------------------------------------------
-- business_hours / special_hours
-- ---------------------------------------------------------------------------

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_hours_open_pair check (
    is_closed or (opens_at is not null and closes_at is not null)
  ),
  constraint business_hours_unique_day unique (business_id, day_of_week)
);

create trigger business_hours_set_updated_at
  before update on public.business_hours
  for each row
  execute function public.set_updated_at();

create index business_hours_business_id_idx on public.business_hours (business_id);

create table public.special_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  on_date date not null,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint special_hours_open_pair check (
    is_closed or (opens_at is not null and closes_at is not null)
  ),
  constraint special_hours_unique_date unique (business_id, on_date)
);

create trigger special_hours_set_updated_at
  before update on public.special_hours
  for each row
  execute function public.set_updated_at();

create index special_hours_business_id_idx on public.special_hours (business_id);
create index special_hours_on_date_idx on public.special_hours (on_date);

-- ---------------------------------------------------------------------------
-- photos
-- ---------------------------------------------------------------------------

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  width integer,
  height integer,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint photos_storage_path_not_blank check (length(trim(storage_path)) > 0)
);

create trigger photos_set_updated_at
  before update on public.photos
  for each row
  execute function public.set_updated_at();

create index photos_business_id_idx on public.photos (business_id) where deleted_at is null;
create unique index photos_one_cover_uidx
  on public.photos (business_id)
  where is_cover and deleted_at is null;

-- ---------------------------------------------------------------------------
-- onboarding_drafts
-- ---------------------------------------------------------------------------

create table public.onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  current_step text not null default 'start',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger onboarding_drafts_set_updated_at
  before update on public.onboarding_drafts
  for each row
  execute function public.set_updated_at();

create index onboarding_drafts_user_id_idx on public.onboarding_drafts (user_id);
create unique index onboarding_drafts_user_active_uidx
  on public.onboarding_drafts (user_id)
  where business_id is null;

-- ---------------------------------------------------------------------------
-- Audit helper — queue critical business mutations (consumed into audit_logs later)
-- ---------------------------------------------------------------------------

create or replace function public.queue_business_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := tg_table_name || '.insert';
    v_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_action := tg_table_name || '.update';
    v_entity_id := new.id;
  else
    v_action := tg_table_name || '.delete';
    v_entity_id := old.id;
  end if;

  -- audit_logs created in 0008; no-op insert via dynamic SQL if table missing during early migrate
  begin
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
    values (
      auth.uid(),
      v_action,
      tg_table_name,
      v_entity_id,
      case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
      case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
    );
  exception
    when undefined_table then
      null;
  end;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Attach audit triggers for privileged lifecycle tables
create trigger business_claims_audit
  after insert or update of status on public.business_claims
  for each row
  execute function public.queue_business_audit();

create trigger businesses_status_audit
  after update of status on public.businesses
  for each row
  when (old.status is distinct from new.status)
  execute function public.queue_business_audit();
