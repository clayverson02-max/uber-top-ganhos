-- O funcionário interno pode acessar os arquivos dos clientes, mas a equipe de rua
-- continua apenas enviando novos documentos.
drop policy if exists client_docs_read_members on storage.objects;
drop policy if exists client_docs_read_admin on storage.objects;
drop policy if exists client_docs_read_ops on storage.objects;
create policy client_docs_read_ops on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-docs'
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'interno'::public.app_role)
    )
  );

drop policy if exists client_docs_update_members on storage.objects;
drop policy if exists client_docs_update_admin on storage.objects;
drop policy if exists client_docs_update_ops on storage.objects;
create policy client_docs_update_ops on storage.objects
  for update to authenticated
  using (
    bucket_id = 'client-docs'
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'interno'::public.app_role)
    )
  )
  with check (
    bucket_id = 'client-docs'
    and (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      or public.has_role(auth.uid(), 'interno'::public.app_role)
    )
  );
