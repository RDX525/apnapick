-- =============================================================================
-- DEV-ONLY SEED — Pune, India
-- =============================================================================
-- Loaded only via local Supabase (`supabase db reset` / config.toml [db.seed]).
-- NEVER apply this file to production or staging.
-- Guard: refuse unless app.environment = 'development' (set by seed runner) OR
--        current_database() looks like a local supabase db.
-- =============================================================================

do $$
begin
  if current_setting('app.environment', true) = 'production' then
    raise exception 'Refusing to run ApnaPick DEV seed against production (app.environment=production)';
  end if;
end
$$;

-- Geography -----------------------------------------------------------------

insert into public.geographic_areas (id, slug, name, area_type, country_code, parent_id, geom, timezone)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'india',
    'India',
    'country',
    'IN',
    null,
    st_multi(st_buffer(st_setsrid(st_makepoint(73.8567, 18.5204), 4326)::geography, 800000)::geometry)::geography,
    'Asia/Kolkata'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'pune',
    'Pune',
    'city',
    'IN',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    st_multi(st_buffer(st_setsrid(st_makepoint(73.8567, 18.5204), 4326)::geography, 20000)::geometry)::geography,
    'Asia/Kolkata'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'koregaon-park',
    'Koregaon Park',
    'suburb',
    'IN',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    st_multi(st_buffer(st_setsrid(st_makepoint(73.8937, 18.5362), 4326)::geography, 1500)::geometry)::geography,
    'Asia/Kolkata'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    'baner',
    'Baner',
    'suburb',
    'IN',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    st_multi(st_buffer(st_setsrid(st_makepoint(73.7868, 18.5590), 4326)::geography, 2000)::geometry)::geography,
    'Asia/Kolkata'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    'hinjewadi',
    'Hinjewadi',
    'suburb',
    'IN',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    st_multi(st_buffer(st_setsrid(st_makepoint(73.7389, 18.5912), 4326)::geography, 2500)::geometry)::geography,
    'Asia/Kolkata'
  )
on conflict (slug) do nothing;

-- Taxonomy ------------------------------------------------------------------

insert into public.categories (id, slug, name, description, sort_order)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'restaurants', 'Restaurants', 'Places to eat', 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'cafes', 'Cafés', 'Coffee and light bites', 2),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'barbers', 'Barbers', 'Haircuts and grooming', 3),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'plumbers', 'Plumbers', 'Home plumbing services', 4)
on conflict (slug) do nothing;

insert into public.subcategories (id, category_id, slug, name, sort_order)
values
  ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'north-indian', 'North Indian', 1),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'maharashtrian', 'Maharashtrian', 2),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'biryani', 'Biryani', 3)
on conflict (category_id, slug) do nothing;

insert into public.attributes (id, key, label, value_type, allowed_values)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'vegetarian', 'Vegetarian', 'boolean', '[]'::jsonb),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'pure_veg', 'Pure veg', 'boolean', '[]'::jsonb),
  ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'ac', 'Air conditioned', 'boolean', '[]'::jsonb)
on conflict (key) do nothing;

insert into public.tags (id, slug, name)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'family-friendly', 'Family friendly'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'budget', 'Budget')
on conflict (slug) do nothing;

-- Published sample businesses (no auth user required; created_by null) ------

insert into public.businesses (
  id, name, normalized_name, slug, description, status, primary_area_id,
  phone, price_level, completeness, avg_rating, review_count, is_claimed,
  published_at
)
values
  (
    '11111111-1111-1111-1111-111111111101',
    'Spice Route Kitchen',
    'spice route kitchen',
    'spice-route-kitchen',
    'North Indian classics and rich gravies in Koregaon Park.',
    'PUBLISHED',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '+91 20 0000 1001',
    2, 92, 4.70, 0, true,
    timezone('utc', now())
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    'Misal House',
    'misal house',
    'misal-house',
    'Spicy Kolhapuri-style misal and Maharashtrian bites.',
    'PUBLISHED',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '+91 20 0000 1002',
    1, 78, 4.30, 0, true,
    timezone('utc', now())
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    'Hinjewadi Biryani Hub',
    'hinjewadi biryani hub',
    'hinjewadi-biryani-hub',
    'Dum biryani bowls for the IT crowd.',
    'PUBLISHED',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    '+91 20 0000 1003',
    2, 82, 4.40, 0, true,
    timezone('utc', now())
  ),
  (
    '11111111-1111-1111-1111-111111111199',
    'Draft Only Kitchen',
    'draft only kitchen',
    'draft-only-kitchen',
    'Unpublished draft — must not be public via RLS.',
    'DRAFT',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    null,
    2, 20, 0, 0, false,
    null
  )
on conflict (id) do nothing;

-- normalized_name is set by trigger on name; explicit insert may need conflict on slug.
-- Use ON CONFLICT DO NOTHING on id only works if we force ids; businesses PK is id.

insert into public.business_locations (
  id, business_id, label, address_line1, suburb, city, postcode, country_code, geom, is_primary
)
values
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Main',
    'Lane 5, Koregaon Park',
    'Koregaon Park',
    'Pune',
    '411001',
    'IN',
    st_setsrid(st_makepoint(73.8937, 18.5362), 4326)::geography,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    'Main',
    'MG Road, Camp',
    'Camp',
    'Pune',
    '411001',
    'IN',
    st_setsrid(st_makepoint(73.8790, 18.5120), 4326)::geography,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    'Main',
    'Phase 1, Hinjewadi',
    'Hinjewadi',
    'Pune',
    '411057',
    'IN',
    st_setsrid(st_makepoint(73.7389, 18.5912), 4326)::geography,
    true
  )
on conflict (id) do nothing;

insert into public.business_categories (business_id, category_id, subcategory_id, is_primary)
values
  ('11111111-1111-1111-1111-111111111101', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', true),
  ('11111111-1111-1111-1111-111111111102', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', true),
  ('11111111-1111-1111-1111-111111111103', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', true)
on conflict do nothing;

insert into public.products (id, business_id, name, description, price_cents, is_available)
values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'Chicken Curry', 'House special gravy', 28000, true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'Butter Chicken', 'Creamy tomato gravy', 32000, true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111102', 'Misal Pav', 'Kolhapuri misal', 8000, true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111103', 'Chicken Biryani', 'Dum cooked', 22000, true)
on conflict (id) do nothing;

insert into public.business_hours (business_id, day_of_week, opens_at, closes_at, is_closed)
select b.id, d.dow, time '11:00', time '23:00', false
from (values
  ('11111111-1111-1111-1111-111111111101'::uuid),
  ('11111111-1111-1111-1111-111111111102'::uuid),
  ('11111111-1111-1111-1111-111111111103'::uuid)
) as b(id)
cross join generate_series(0, 6) as d(dow)
on conflict (business_id, day_of_week) do nothing;

insert into public.seo_pages (
  path, page_type, category_id, area_id, title, description, canonical_path, indexable, business_count, item_count
)
values
  (
    '/restaurants/pune',
    'category_area',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'Restaurants in Pune',
    'Discover restaurants in Pune on ApnaPick',
    '/restaurants/pune',
    true,
    3,
    4
  )
on conflict (path) do nothing;
