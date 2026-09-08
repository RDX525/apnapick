-- Geographic discovery: expose lat/lng from nearby_businesses for map markers
-- DROP required: CREATE OR REPLACE cannot change OUT/RETURNS TABLE columns.

set search_path = public, extensions;

drop function if exists public.nearby_businesses(
  double precision, double precision, double precision, integer
);

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
  city text,
  lat double precision,
  lng double precision
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
    bl.city,
    st_y(bl.geom::geometry) as lat,
    st_x(bl.geom::geometry) as lng
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
    and bl.geom is not null
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
  'Published businesses within radius via PostGIS ST_DWithin, with lat/lng for maps.';

-- Batch coordinates for map markers (search enrichment)
create or replace function public.business_coordinates(p_ids uuid[])
returns table (
  business_id uuid,
  lat double precision,
  lng double precision,
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
    st_y(bl.geom::geometry) as lat,
    st_x(bl.geom::geometry) as lng,
    bl.suburb,
    bl.city
  from public.businesses b
  join lateral (
    select l.geom, l.suburb, l.city
    from public.business_locations l
    where l.business_id = b.id
      and l.geom is not null
    order by l.is_primary desc, l.created_at asc
    limit 1
  ) bl on true
  where b.id = any (p_ids)
    and b.status = 'PUBLISHED'
    and b.deleted_at is null;
$$;

grant execute on function public.business_coordinates(uuid[])
  to anon, authenticated, service_role;
