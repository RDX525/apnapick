-- Tighten business-photos storage: MIME allowlist, 5 MB cap, image extensions only.

update storage.buckets
set
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'business-photos';

drop policy if exists business_photos_member_insert on storage.objects;
create policy business_photos_member_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-photos'
    and lower(split_part(name, '.', -1)) in ('jpg', 'jpeg', 'png', 'webp', 'gif')
    and (
      public.has_business_permission(
        public.try_uuid(split_part(name, '/', 1)),
        'manage_profile'
      )
      or public.is_admin()
    )
  );
