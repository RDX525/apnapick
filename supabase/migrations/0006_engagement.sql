-- ApnaPick: engagement — reviews, favorites, leads, notifications, reports

-- ---------------------------------------------------------------------------
-- Reviews (rating embedded; denormalized onto businesses)
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  status public.review_status not null default 'PUBLISHED',
  reply_body text,
  replied_at timestamptz,
  replied_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_one_per_user unique (business_id, user_id)
);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row
  execute function public.set_updated_at();

create index reviews_business_id_idx
  on public.reviews (business_id)
  where deleted_at is null and status = 'PUBLISHED';

create index reviews_user_id_idx on public.reviews (user_id);

-- Keep businesses.avg_rating / review_count in sync
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
      round(avg(r.rating)::numeric, 2) as avg_rating
    from public.reviews r
    where r.business_id = p_business_id
      and r.deleted_at is null
      and r.status = 'PUBLISHED'
  ) s
  where b.id = p_business_id;
end;
$$;

create or replace function public.reviews_refresh_business_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  v_business_id := coalesce(new.business_id, old.business_id);
  perform public.refresh_business_rating(v_business_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.reviews_refresh_business_rating();

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, business_id)
);

create index favorites_business_id_idx on public.favorites (business_id);

-- ---------------------------------------------------------------------------
-- Leads (enquiry / call / directions intents)
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  lead_type public.lead_type not null default 'ENQUIRY',
  name text,
  email extensions.citext,
  phone text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index leads_business_id_idx on public.leads (business_id);
create index leads_user_id_idx on public.leads (user_id);
create index leads_created_at_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type public.notification_type not null default 'SYSTEM',
  title text not null,
  body text,
  link_path text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notifications_user_id_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index notifications_user_id_idx on public.notifications (user_id);

-- ---------------------------------------------------------------------------
-- Reports (trust & safety)
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status public.report_status not null default 'OPEN',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger reports_set_updated_at
  before update on public.reports
  for each row
  execute function public.set_updated_at();

create index reports_status_idx on public.reports (status);
create index reports_target_idx on public.reports (target_type, target_id);
create index reports_reporter_id_idx on public.reports (reporter_id);
