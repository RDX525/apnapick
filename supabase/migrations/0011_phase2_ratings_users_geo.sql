-- Phase 2 completion: explicit ratings entity, users compatibility view,
-- geo helpers, ownership validation, nearby businesses function.
-- Builds on 0001–0010.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- ratings — first-class scores (kept in sync from reviews)
-- ---------------------------------------------------------------------------

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  review_id uuid references public.reviews (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ratings_one_per_user unique (business_id, user_id)
);

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row
  execute function public.set_updated_at();

create index ratings_business_id_idx
  on public.ratings (business_id)
  where deleted_at is null;

create index ratings_user_id_idx on public.ratings (user_id);
create index ratings_review_id_idx on public.ratings (review_id);

comment on table public.ratings is
  'Per-user business scores. Synced from reviews; supports rating aggregation independent of review text.';

-- Sync ratings from reviews
create or replace function public.sync_rating_from_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.ratings
    set deleted_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where review_id = old.id
       or (business_id = old.business_id and user_id = old.user_id);
    perform public.refresh_business_rating(old.business_id);
    return old;
  end if;

  insert into public.ratings (business_id, user_id, score, review_id, deleted_at)
  values (
    new.business_id,
    new.user_id,
    new.rating,
    new.id,
    case
      when new.deleted_at is not null then new.deleted_at
      when new.status is distinct from 'PUBLISHED' then timezone('utc', now())
      else null
    end
  )
  on conflict (business_id, user_id) do update
  set
    score = excluded.score,
    review_id = excluded.review_id,
    deleted_at = excluded.deleted_at,
    updated_at = timezone('utc', now());

  perform public.refresh_business_rating(new.business_id);
  return new;
end;
$$;

drop trigger if exists reviews_sync_rating on public.reviews;
drop trigger if exists reviews_00_sync_rating on public.reviews;
create trigger reviews_00_sync_rating
  after insert or delete or update of rating, deleted_at, status on public.reviews
  for each row
  execute function public.sync_rating_from_review();

-- Backfill ratings from existing reviews
insert into public.ratings (business_id, user_id, score, review_id, deleted_at)
select
  r.business_id,
  r.user_id,
  r.rating,
  r.id,
  case
    when r.deleted_at is not null then r.deleted_at
    when r.status is distinct from 'PUBLISHED' then timezone('utc', now())
    else null
  end
from public.reviews r
on conflict (business_id, user_id) do update
set
  score = excluded.score,
  review_id = excluded.review_id,
  deleted_at = excluded.deleted_at,
  updated_at = timezone('utc', now());

-- Prefer ratings table for aggregation (falls back gracefully)
create or replace function public.refresh_business_rating(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.businesses b
  set
    review_count = coalesce(s.cnt, 0),
    avg_rating = coalesce(s.avg_rating, 0),
    updated_at = timezone('utc', now())
  from (
    select
      count(*)::integer as cnt,
      round(avg(r.score)::numeric, 2) as avg_rating
    from public.ratings r
    where r.business_id = p_business_id
      and r.deleted_at is null
  ) s
  where b.id = p_business_id;
end;
$$;

create or replace function public.aggregate_business_rating(p_business_id uuid)
returns table (
  business_id uuid,
  rating_count integer,
  avg_rating numeric,
  bayesian_avg numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with stats as (
    select
      p_business_id as business_id,
      count(*)::integer as rating_count,
      coalesce(round(avg(score)::numeric, 2), 0) as avg_rating
    from public.ratings
    where business_id = p_business_id
      and deleted_at is null
  )
  select
    s.business_id,
    s.rating_count,
    s.avg_rating,
    round(
      ((3.7::numeric * 8) + (s.avg_rating * s.rating_count))
        / nullif(8 + s.rating_count, 0),
      2
    ) as bayesian_avg
  from stats s;
$$;

grant execute on function public.aggregate_business_rating(uuid)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- users — compatibility surface over auth.users + profiles
-- (Canonical identity remains auth.users; profiles holds app fields.)
-- ---------------------------------------------------------------------------

create or replace view public.users
with (security_invoker = true) as
select
  u.id,
  u.email::text as email,
  u.phone,
  u.created_at,
  u.updated_at,
  u.last_sign_in_at,
  u.email_confirmed_at,
  p.display_name,
  p.avatar_url,
  p.locale,
  p.bio
from auth.users u
join public.profiles p on p.id = u.id;

comment on view public.users is
  'Compatibility view: auth.users + profiles. Prefer profiles + auth APIs in application code.';

revoke all on public.users from anon;
grant select on public.users to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Distance + nearby helpers (PostGIS)
-- ---------------------------------------------------------------------------

create or replace function public.distance_meters(
  p_lat double precision,
  p_lng double precision,
  p_geom extensions.geography
)
returns double precision
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select st_distance(
    p_geom,
    st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  );
$$;

grant execute on function public.distance_meters(double precision, double precision, extensions.geography)
  to anon, authenticated, service_role;

create or replace function public.nearby_businesses(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision default 5000,
  p_limit integer default 50
)
returns table (
  business_id uuid,
  name text,
  slug text,
  avg_rating numeric,
  review_count integer,
  distance_m double precision,
  suburb text,
  city text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    b.id as business_id,
    b.name,
    b.slug,
    b.avg_rating,
    b.review_count,
    public.distance_meters(p_lat, p_lng, bl.geom) as distance_m,
    bl.suburb,
    bl.city
  from public.businesses b
  join lateral (
    select l.geom, l.suburb, l.city
    from public.business_locations l
    where l.business_id = b.id
    order by l.is_primary desc, l.created_at asc
    limit 1
  ) bl on true
  where b.status = 'PUBLISHED'
    and b.deleted_at is null
    and st_dwithin(
      bl.geom,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      greatest(100, coalesce(p_radius_m, 5000))
    )
  order by distance_m asc nulls last, b.avg_rating desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

grant execute on function public.nearby_businesses(double precision, double precision, double precision, integer)
  to anon, authenticated, service_role;

comment on function public.nearby_businesses is
  'Published businesses within radius, ordered by PostGIS distance.';

-- ---------------------------------------------------------------------------
-- Ownership validation
-- ---------------------------------------------------------------------------

create or replace function public.validate_business_ownership(
  p_business_id uuid,
  p_user_id uuid default auth.uid()
)
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
      and bm.user_id = coalesce(p_user_id, auth.uid())
      and bm.role = 'OWNER'
  )
  or public.is_admin();
$$;

revoke all on function public.validate_business_ownership(uuid, uuid) from public;
grant execute on function public.validate_business_ownership(uuid, uuid)
  to authenticated, service_role;

create or replace function public.validate_business_membership(
  p_business_id uuid,
  p_user_id uuid default auth.uid()
)
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
      and bm.user_id = coalesce(p_user_id, auth.uid())
  )
  or public.is_admin();
$$;

revoke all on function public.validate_business_membership(uuid, uuid) from public;
grant execute on function public.validate_business_membership(uuid, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS for ratings
-- ---------------------------------------------------------------------------

alter table public.ratings enable row level security;

create policy ratings_public_read
  on public.ratings for select
  to anon, authenticated
  using (
    deleted_at is null
    and public.business_is_publicly_readable(business_id)
  );

create policy ratings_own_read
  on public.ratings for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_business_member(business_id));

-- Writes go through reviews sync (security definer) or admin tooling
create policy ratings_admin_write
  on public.ratings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Harden profile visibility: anon sees only display fields via select policy
-- (full row still limited — phone/bio still readable; app must not over-fetch.
--  Documented; optional column-level grants can tighten further later.)
-- ---------------------------------------------------------------------------

-- Ensure SUPER_ADMIN inherits admin checks (already via is_admin)
-- Add explicit helper for app RBAC documentation surface
create or replace function public.current_roles()
returns public.app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(ur.role), '{}'::public.app_role[])
  from public.user_roles ur
  where ur.user_id = auth.uid();
$$;

revoke all on function public.current_roles() from public;
grant execute on function public.current_roles() to authenticated, service_role;
