create table if not exists public.public_registration_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  city text not null,
  source text not null default 'public_cadastro',
  status text not null default 'capturado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_registration_leads_name_length check (char_length(trim(full_name)) between 3 and 150),
  constraint public_registration_leads_whatsapp_length check (char_length(trim(whatsapp)) between 10 and 20),
  constraint public_registration_leads_city_length check (char_length(trim(city)) between 2 and 120),
  constraint public_registration_leads_source_check check (source = 'public_cadastro'),
  constraint public_registration_leads_status_check check (status in ('capturado', 'em_atendimento', 'convertido', 'descartado'))
);

alter table public.public_registration_leads enable row level security;

grant insert on table public.public_registration_leads to anon;
grant select, update on table public.public_registration_leads to authenticated;

drop policy if exists "public registration leads can be created" on public.public_registration_leads;
create policy "public registration leads can be created"
on public.public_registration_leads for insert to anon
with check (
  char_length(trim(full_name)) between 3 and 150
  and char_length(trim(whatsapp)) between 10 and 20
  and char_length(trim(city)) between 2 and 120
  and source = 'public_cadastro'
  and status = 'capturado'
);

drop policy if exists "members can view public registration leads" on public.public_registration_leads;
create policy "members can view public registration leads"
on public.public_registration_leads for select to authenticated
using ((select public.is_member((select auth.uid()))));

drop policy if exists "members can update public registration leads" on public.public_registration_leads;
create policy "members can update public registration leads"
on public.public_registration_leads for update to authenticated
using ((select public.is_member((select auth.uid()))))
with check ((select public.is_member((select auth.uid()))));

create index if not exists public_registration_leads_created_at_idx
on public.public_registration_leads (created_at desc);
