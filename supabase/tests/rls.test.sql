-- ApnaPick RLS + schema smoke tests
-- Preferred: `supabase start && supabase db reset && supabase test db`
-- Fallback: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
-- Entire script runs in a transaction and ROLLBACKs.

begin;

create extension if not exists pgtap;

select plan(16);

-- Published readable by anon role
set local role anon;

select ok(
  exists (select 1 from public.businesses where slug = 'spice-route-kitchen'),
  'anon can read published business'
);

select is_empty(
  $$ select 1 from public.businesses where slug = 'draft-only-kitchen' $$,
  'anon cannot read draft business'
);

select ok(
  exists (select 1 from public.products where name = 'Chicken Curry'),
  'anon can read published products'
);

select ok(
  (select count(*) from public.nearby_businesses(18.5204, 73.8567, 25000, 20)) >= 1,
  'nearby_businesses returns rows for Pune center'
);

-- Authenticated cannot favorite as another user
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok(
  $$ insert into public.favorites (user_id, business_id)
     values ('00000000-0000-4000-8000-000000000099', '11111111-1111-1111-1111-111111111101') $$,
  '42501',
  null,
  'cannot insert favorite for another user'
);

-- service_role sees drafts
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

select ok(
  exists (select 1 from public.businesses where slug = 'draft-only-kitchen'),
  'service_role can read drafts'
);

reset role;

select ok(public.distance_meters(
  18.5204, 73.8567,
  st_setsrid(st_makepoint(73.8567, 18.5204), 4326)::geography
) < 1, 'distance_meters is ~0 for same point');

select ok(to_regprocedure('public.validate_business_ownership(uuid,uuid)') is not null,
  'validate_business_ownership exists');
select ok(to_regprocedure('public.aggregate_business_rating(uuid)') is not null,
  'aggregate_business_rating exists');
select ok(to_regprocedure('public.nearby_businesses(double precision,double precision,double precision,integer)') is not null,
  'nearby_businesses exists');
select ok(to_regclass('public.ratings') is not null, 'ratings exists');
select ok(to_regclass('public.users') is not null, 'users view exists');
select ok(to_regclass('public.seo_pages') is not null, 'seo_pages exists');
select ok(to_regclass('public.geographic_areas') is not null, 'geographic_areas exists');
select ok(
  exists (select 1 from pg_indexes where indexname = 'business_locations_geom_gix'),
  'spatial index on business_locations.geom exists'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.businesses'::regclass),
  'RLS enabled on businesses'
);

select finish();
rollback;
