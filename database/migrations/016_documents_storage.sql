-- ImobOps — 016 private Supabase Storage bucket for documents.
-- Files are isolated by path: tenancies/{tenancy_id}/{entity_type}/{entity_id}/{document_id}/{file_name}

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

create policy documents_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'tenancies'
    and ((storage.foldername(name))[2])::uuid = auth_tenancy_id()
  );

create policy documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'tenancies'
    and ((storage.foldername(name))[2])::uuid = auth_tenancy_id()
  );

create policy documents_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'tenancies'
    and ((storage.foldername(name))[2])::uuid = auth_tenancy_id()
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'tenancies'
    and ((storage.foldername(name))[2])::uuid = auth_tenancy_id()
  );

create policy documents_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'tenancies'
    and ((storage.foldername(name))[2])::uuid = auth_tenancy_id()
  );
