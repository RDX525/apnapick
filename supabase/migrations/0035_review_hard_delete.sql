-- Author review deletion is permanent (hard delete). Soft-deleted rows are cleaned up.

create policy reviews_delete_own_or_admin
  on public.reviews for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

comment on policy reviews_delete_own_or_admin on public.reviews is
  'Authors may permanently delete their own review; admins may delete any review.';

-- Remove previously soft-deleted reviews so they cannot be revived
delete from public.reviews
where deleted_at is not null;
