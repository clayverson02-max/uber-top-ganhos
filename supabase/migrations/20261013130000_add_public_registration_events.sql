create table if not exists public.public_registration_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.public_registration_leads(id) on delete cascade,
  event_type text not null check (event_type in ('self_registration', 'consultant_whatsapp')),
  created_at timestamptz not null default now()
);

alter table public.public_registration_events enable row level security;
grant insert on table public.public_registration_events to anon;
grant select on table public.public_registration_events to authenticated;

drop policy if exists "public registration events can be created" on public.public_registration_events;
create policy "public registration events can be created"
on public.public_registration_events for insert to anon
with check (exists (select 1 from public.public_registration_leads lead where lead.id = lead_id));

drop policy if exists "members can view public registration events" on public.public_registration_events;
create policy "members can view public registration events"
on public.public_registration_events for select to authenticated
using ((select public.is_member((select auth.uid()))));

create index if not exists public_registration_events_lead_id_idx on public.public_registration_events (lead_id);
create index if not exists public_registration_events_type_created_at_idx on public.public_registration_events (event_type, created_at desc);
