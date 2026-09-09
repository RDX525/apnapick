-- Owner-facing onboarding categories used by the listing wizard.

insert into public.categories (slug, name, description, sort_order, is_active)
values
  ('food-dining', 'Food & Dining', 'Restaurants, cafés, and local flavour', 1, true),
  ('beauty-personal-care', 'Beauty & Personal Care', 'Salons, spas, and skincare', 2, true),
  ('clothing-fashion', 'Clothing & Fashion', 'Boutiques, tailors, and style', 3, true),
  ('shopping-retail', 'Shopping & Retail', 'Markets, stores, and everyday buys', 4, true),
  ('home-repair', 'Home & Repair Services', 'Plumbers, electricians, and fixes', 5, true),
  ('fitness-sports', 'Fitness & Sports', 'Gyms, yoga, and training', 6, true),
  ('health-wellness', 'Health & Wellness', 'Clinics, dentists, and care', 7, true),
  ('automotive', 'Automotive', 'Service, repairs, and spares', 8, true),
  ('education-learning', 'Education & Learning', 'Classes, tutors, and coaching', 9, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

-- Keep older seed slugs searchable without blocking new onboarding categories.
update public.categories
set is_active = true
where slug in ('restaurants', 'cafes', 'barbers', 'plumbers');
