-- ApnaPick: catalog — categories, products, services, menus, attributes, tags, offers

-- ---------------------------------------------------------------------------
-- Taxonomy
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_slug_unique unique (slug),
  constraint categories_name_not_blank check (length(trim(name)) > 0)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subcategories_slug_per_category unique (category_id, slug),
  constraint subcategories_name_not_blank check (length(trim(name)) > 0)
);

create trigger subcategories_set_updated_at
  before update on public.subcategories
  for each row
  execute function public.set_updated_at();

create index subcategories_category_id_idx on public.subcategories (category_id);

create table public.business_categories (
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  subcategory_id uuid references public.subcategories (id) on delete set null,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, category_id)
);

create index business_categories_category_id_idx on public.business_categories (category_id);
create unique index business_categories_one_primary_uidx
  on public.business_categories (business_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- Attributes & tags
-- ---------------------------------------------------------------------------

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label text not null,
  value_type text not null default 'boolean', -- boolean | enum | text | number
  allowed_values jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint attributes_key_unique unique (key)
);

create table public.business_attributes (
  business_id uuid not null references public.businesses (id) on delete cascade,
  attribute_id uuid not null references public.attributes (id) on delete cascade,
  value text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, attribute_id)
);

create index business_attributes_attribute_id_idx on public.business_attributes (attribute_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint tags_slug_unique unique (slug),
  constraint tags_name_not_blank check (length(trim(name)) > 0)
);

create table public.business_tags (
  business_id uuid not null references public.businesses (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, tag_id)
);

create index business_tags_tag_id_idx on public.business_tags (tag_id);

-- ---------------------------------------------------------------------------
-- Products & services
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  slug text,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency char(3) not null default 'INR',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_name_not_blank check (length(trim(name)) > 0)
);

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

create index products_business_id_idx on public.products (business_id) where deleted_at is null;
create index products_name_trgm_idx
  on public.products
  using gin (name extensions.gin_trgm_ops);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  slug text,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency char(3) not null default 'INR',
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint services_name_not_blank check (length(trim(name)) > 0)
);

create trigger services_set_updated_at
  before update on public.services
  for each row
  execute function public.set_updated_at();

create index services_business_id_idx on public.services (business_id) where deleted_at is null;
create index services_name_trgm_idx
  on public.services
  using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Menus (restaurants / cafes)
-- ---------------------------------------------------------------------------

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null default 'Main menu',
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger menus_set_updated_at
  before update on public.menus
  for each row
  execute function public.set_updated_at();

create index menus_business_id_idx on public.menus (business_id);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger menu_categories_set_updated_at
  before update on public.menu_categories
  for each row
  execute function public.set_updated_at();

create index menu_categories_menu_id_idx on public.menu_categories (menu_id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_category_id uuid not null references public.menu_categories (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name text not null,
  description text,
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency char(3) not null default 'INR',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint menu_items_name_not_blank check (length(trim(name)) > 0)
);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row
  execute function public.set_updated_at();

create index menu_items_menu_category_id_idx on public.menu_items (menu_category_id);
create index menu_items_product_id_idx on public.menu_items (product_id);

-- ---------------------------------------------------------------------------
-- Offers
-- ---------------------------------------------------------------------------

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null,
  description text,
  discount_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint offers_title_not_blank check (length(trim(title)) > 0),
  constraint offers_date_range check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

create trigger offers_set_updated_at
  before update on public.offers
  for each row
  execute function public.set_updated_at();

create index offers_business_id_idx on public.offers (business_id) where deleted_at is null;
create index offers_active_window_idx
  on public.offers (starts_at, ends_at)
  where is_active and deleted_at is null;
