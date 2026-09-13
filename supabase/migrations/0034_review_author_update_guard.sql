-- Authors must be able to edit/revive their own reviews, including re-assessed
-- abuse signals on reviews.moderation. Only business owners stay reply-only.

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

  -- Review authors may update their own row (content, soft-delete/revive, moderation signals).
  if old.user_id = auth.uid() then
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

comment on function public.reviews_guard_owner_columns() is
  'Admins: full update. Authors: own review. Owners: reply fields only.';
