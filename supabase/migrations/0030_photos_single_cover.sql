-- Dashboard photo saves insert several rows in one transaction. The unique
-- "one live cover" index can fire mid-loop. Demote other covers first.

create or replace function public.photos_enforce_single_cover()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.is_cover and new.deleted_at is null then
    update public.photos
    set is_cover = false
    where business_id = new.business_id
      and id is distinct from new.id
      and is_cover
      and deleted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists photos_enforce_single_cover on public.photos;
create trigger photos_enforce_single_cover
  before insert or update of is_cover, deleted_at, business_id
  on public.photos
  for each row
  execute function public.photos_enforce_single_cover();
