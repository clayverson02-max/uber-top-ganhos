create table if not exists public.public_registration_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.public_registration_leads(id) on delete cascade,
  doc_type text not null check (doc_type in ('energy_bill','identity')),
  file_name text not null,
  file_path text not null unique,
  content_type text not null,
  created_at timestamptz not null default now()
);

alter table public.public_registration_documents enable row level security;
grant insert on public.public_registration_documents to anon;
grant select on public.public_registration_documents to authenticated;

drop policy if exists "public registration documents can be created" on public.public_registration_documents;
create policy "public registration documents can be created"
on public.public_registration_documents for insert to anon
with check (
  exists (select 1 from public.public_registration_leads lead where lead.id = lead_id)
  and doc_type in ('energy_bill','identity')
);

drop policy if exists "members can view public registration documents" on public.public_registration_documents;
create policy "internal team can view public registration documents"
on public.public_registration_documents for select to authenticated
using (
  (select public.has_role((select auth.uid()), 'admin'::public.app_role))
  or (select public.has_role((select auth.uid()), 'interno'::public.app_role))
);

drop policy if exists "public lead documents can upload" on storage.objects;
create policy "public lead documents can upload"
on storage.objects for insert to anon
with check (
  bucket_id = 'client-docs'
  and (storage.foldername(name))[1] = 'public-leads'
  and (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
  and exists (
    select 1 from public.public_registration_leads lead
    where lead.id = ((storage.foldername(name))[2])::uuid
  )
);

drop policy if exists "members can view public lead documents" on storage.objects;
create policy "internal team can view public lead documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'client-docs'
  and (storage.foldername(name))[1] = 'public-leads'
  and (
    (select public.has_role((select auth.uid()), 'admin'::public.app_role))
    or (select public.has_role((select auth.uid()), 'interno'::public.app_role))
  )
);

create index if not exists public_registration_documents_lead_id_idx
on public.public_registration_documents (lead_id);
