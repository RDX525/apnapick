-- Profiles contain private fields such as phone numbers. Public business and
-- review data must come from dedicated public tables/views, never profiles.

drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_select_anon_limited on public.profiles;

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());
