-- Add Beauty & Personal Care to the public business taxonomy.

insert into public.categories (slug, name, description, sort_order, is_active)
values (
  'beauty-personal-care',
  'Beauty & Personal Care',
  'Salons, spas, skincare, and grooming',
  4,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

update public.categories
set sort_order = 5
where slug = 'plumbers' and sort_order = 4;
