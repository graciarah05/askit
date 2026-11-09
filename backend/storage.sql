-- Run after schema.sql in the same Supabase project.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('askit-images','askit-images',true,3145728,array['image/jpeg','image/png','image/webp']);
create policy askit_images_insert on storage.objects for insert to authenticated
with check(bucket_id='askit-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy askit_images_read on storage.objects for select to anon,authenticated
using(bucket_id='askit-images');
create policy askit_images_delete on storage.objects for delete to authenticated
using(bucket_id='askit-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
