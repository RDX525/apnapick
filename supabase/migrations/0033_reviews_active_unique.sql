-- One active review per user per business (allow re-review after soft-delete)

alter table public.reviews
  drop constraint if exists reviews_one_per_user;

create unique index if not exists reviews_one_active_per_user_idx
  on public.reviews (business_id, user_id)
  where deleted_at is null;

comment on index public.reviews_one_active_per_user_idx is
  'Authors may soft-delete and later post again; only one non-deleted review per business.';
