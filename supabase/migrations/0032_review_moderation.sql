-- ApnaPick: persist review moderation signals + verification requests

alter table public.reviews
  add column if not exists moderation jsonb not null default '{}'::jsonb;

comment on column public.reviews.moderation is
  'Trust signals and admin moderation state (risk, signals, flags, verification). Not public.';

create index if not exists reviews_pending_moderation_idx
  on public.reviews (created_at desc)
  where deleted_at is null and status = 'PENDING';

-- Authors/owners must not clear or forge moderation metadata
create or replace function public.reviews_guard_owner_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.user_id = auth.uid() then
    if new.moderation is distinct from old.moderation then
      raise exception 'review authors may not update moderation metadata';
    end if;
    return new;
  end if;

  if public.is_business_owner(old.business_id) then
    if new.business_id is distinct from old.business_id
      or new.user_id is distinct from old.user_id
      or new.rating is distinct from old.rating
      or new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.status is distinct from old.status
      or new.deleted_at is distinct from old.deleted_at
      or new.moderation is distinct from old.moderation then
      raise exception 'business owners may only update review reply fields';
    end if;
    return new;
  end if;

  raise exception 'forbidden review update';
end;
$$;
