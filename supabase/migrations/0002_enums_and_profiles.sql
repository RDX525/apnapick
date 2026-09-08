-- ApnaPick: enums, profiles (extends auth.users), multi-role RBAC, updated_at helper

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'USER',
  'BUSINESS_OWNER',
  'BUSINESS_STAFF',
  'ADMIN',
  'SUPER_ADMIN'
);

create type public.business_status as enum (
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'REJECTED',
  'SUSPENDED',
  'MERGED'
);

create type public.claim_status as enum (
  'PENDING',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

create type public.business_member_role as enum (
  'OWNER',
  'STAFF'
);

create type public.geographic_area_type as enum (
  'country',
  'city',
  'suburb',
  'neighborhood'
);

create type public.review_status as enum (
  'PENDING',
  'PUBLISHED',
  'HIDDEN',
  'REJECTED'
);

create type public.lead_type as enum (
  'ENQUIRY',
  'CALL',
  'DIRECTIONS',
  'WEBSITE',
  'OTHER'
);

create type public.notification_type as enum (
  'SYSTEM',
  'REVIEW',
  'CLAIM',
  'LEAD',
  'MODERATION',
  'BILLING'
);

create type public.report_status as enum (
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED',
  'DISMISSED'
);

create type public.report_target_type as enum (
  'BUSINESS',
  'REVIEW',
  'USER',
  'PHOTO'
);

create type public.seo_page_type as enum (
  'category',
  'category_area',
  'category_area_facet'
);

create type public.subscription_status as enum (
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'EXPIRED'
);

create type public.payment_status as enum (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  bio text,
  locale text not null default 'en-IN',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

comment on table public.profiles is 'App profile extending auth.users; roles live in user_roles.';

-- ---------------------------------------------------------------------------
-- user_roles — multi-role RBAC
-- ---------------------------------------------------------------------------

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint user_roles_user_role_unique unique (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);
create index user_roles_role_idx on public.user_roles (role);

-- Auto-create profile + default USER role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'USER')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helper functions (used by RLS)
-- ---------------------------------------------------------------------------

create or replace function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = check_role
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('SUPER_ADMIN');
$$;

revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_super_admin() from public;
grant execute on function public.has_role(public.app_role) to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_super_admin() to authenticated, service_role;
