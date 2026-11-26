-- GPCPSN Alumni Network | 3/4 storage
-- Image buckets with size/type limits and per-owner upload paths.
-- Public buckets are readable by URL (needed to show images) but cannot be listed by strangers.
-- Free plan has 1 GB of file storage in total: the front end must resize images before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',        'avatars',        true,  524288,  array['image/jpeg', 'image/png', 'image/webp']),
  ('covers',         'covers',         true,  1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('job-logos',      'job-logos',      true,  524288,  array['image/jpeg', 'image/png', 'image/webp']),
  ('article-images', 'article-images', true,  1572864, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-banners',  'event-banners',  true,  1572864, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Member buckets: path must be  <user-id>/<safe-file-name>.<jpg|jpeg|png|webp>
-- avatars/covers: any signed-in member; job logos and article images: verified members only.
create policy gpcpsn_member_images_insert on storage.objects for insert to authenticated
with check (
  (
    (bucket_id in ('avatars', 'covers') )
    or (bucket_id in ('job-logos', 'article-images') and private.is_verified())
  )
  and (storage.foldername(name))[1] = auth.uid()::text
  and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}\.(jpg|jpeg|png|webp)$'
);

create policy gpcpsn_member_images_select on storage.objects for select to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and (storage.foldername(name))[1] = auth.uid()::text);

create policy gpcpsn_member_images_update on storage.objects for update to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and (storage.foldername(name))[1] = auth.uid()::text
            and name ~* '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}\.(jpg|jpeg|png|webp)$');

create policy gpcpsn_member_images_delete on storage.objects for delete to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and (storage.foldername(name))[1] = auth.uid()::text);

-- Event banners: administrators only. Path: events/<safe-file-name>
create policy gpcpsn_event_banners_admin on storage.objects for all to authenticated
using (bucket_id = 'event-banners' and private.is_admin())
with check (bucket_id = 'event-banners' and private.is_admin()
            and name ~* '^events/[A-Za-z0-9._-]{1,100}\.(jpg|jpeg|png|webp)$');

-- Admins may see and remove any member image (moderation). Deleting needs read access too.
create policy gpcpsn_admin_select_images on storage.objects for select to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and private.is_admin());

create policy gpcpsn_admin_delete_images on storage.objects for delete to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and private.is_admin());
