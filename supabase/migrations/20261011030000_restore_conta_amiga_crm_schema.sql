
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'equipe');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.client_status as enum (
    'novo',
    'primeiro_contato',
    'aguardando_documentos',
    'documentos_recebidos',
    'documentos_em_analise',
    'cadastro_concluido',
    'cliente_ativo',
    'cliente_inativo',
    'nao_prosseguiu',
    'cadastro_duplicado'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.doc_status as enum ('pendente', 'recebido', 'em_analise', 'aprovado', 'rejeitado');
exception when duplicate_object then null;
end $$;

create table if not exists public.leads (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  whatsapp text not null,
  email text not null,
  order_bump_active boolean not null default false,
  total_price numeric(10,2) not null,
  fbp text,
  fbc text,
  user_agent text,
  ip_address text,
  event_id text,
  source text default 'checkout',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  code integer generated always as identity unique,
  full_name text not null,
  email text not null,
  whatsapp text not null,
  origin text not null check (origin in ('anuncio', 'whatsapp')),
  status public.client_status not null default 'novo',
  avg_bill numeric(12,2),
  notes text,
  last_contact_at date,
  next_contact_at date,
  responsible_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  stopped_responding boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  doc_type text not null check (doc_type in ('fatura', 'documento_foto')),
  file_name text not null,
  file_path text not null,
  status public.doc_status not null default 'pendente',
  is_current boolean not null default true,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.client_history (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bonuses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  responsible_id uuid references public.profiles(id) on delete set null,
  amount numeric(10,2) not null default 25,
  status text not null default 'pendente' check (status in ('pendente', 'confirmada')),
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_revenues (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reference_month date not null,
  bill_amount numeric(12,2) not null,
  percent numeric(6,4) not null default 0.04,
  revenue numeric(12,2) not null default 0,
  is_estimate boolean not null default true,
  receipt_status text not null default 'pendente' check (receipt_status in ('pendente', 'recebido')),
  notes text,
  created_at timestamptz not null default now(),
  unique (client_id, reference_month)
);

create index if not exists idx_leads_created_at on public.leads(created_at desc);
create index if not exists idx_clients_created_at on public.clients(created_at desc);
create index if not exists idx_clients_deleted_at on public.clients(deleted_at);
create index if not exists idx_clients_status on public.clients(status);
create index if not exists idx_client_documents_client on public.client_documents(client_id);
create index if not exists idx_client_history_client on public.client_history(client_id, created_at desc);
create index if not exists idx_bonuses_status on public.bonuses(status);
create index if not exists idx_monthly_revenues_reference on public.monthly_revenues(reference_month desc);

create or replace function public.is_member(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    _user_id is not null
    and exists (
      select 1
      from public.profiles p
      join public.user_roles ur on ur.user_id = p.id
      where p.id = _user_id and p.active = true
    );
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      auth.uid() = _user_id
      or coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    )
    and exists (
      select 1 from public.user_roles
      where user_id = _user_id and role = _role
    );
$$;

create or replace function public.can_access_client(_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_member(auth.uid())
    and exists (select 1 from public.clients where id = _client);
$$;

revoke all on function public.is_member(uuid) from public;
revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.can_access_client(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated, service_role;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.can_access_client(uuid) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    true
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_client_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.client_history (client_id, user_id, kind, description)
    values (new.id, auth.uid(), 'status', 'Status alterado para ' || new.status::text);
  end if;

  if new.status = 'cadastro_concluido'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.bonuses (client_id, responsible_id, amount)
    values (new.id, coalesce(new.responsible_id, new.created_by), 25)
    on conflict (client_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_client_status() from public;
grant execute on function public.handle_client_status() to authenticated, service_role;

drop trigger if exists clients_handle_status on public.clients;
create trigger clients_handle_status
  after insert or update of status on public.clients
  for each row execute procedure public.handle_client_status();

create or replace function public.set_monthly_revenue()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.reference_month = date_trunc('month', new.reference_month)::date;
  new.revenue = round((new.bill_amount * new.percent)::numeric, 2);
  return new;
end;
$$;

drop trigger if exists monthly_revenues_set_revenue on public.monthly_revenues;
create trigger monthly_revenues_set_revenue
  before insert or update of bill_amount, percent, reference_month on public.monthly_revenues
  for each row execute procedure public.set_monthly_revenue();

create or replace function public.find_duplicates(
  _whatsapp text,
  _email text,
  _exclude uuid default null
)
returns table (
  id uuid,
  code integer,
  full_name text,
  status public.client_status,
  match text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_member(auth.uid()) then
    raise exception 'Acesso não autorizado';
  end if;

  return query
  select
    c.id,
    c.code,
    c.full_name,
    c.status,
    case
      when c.whatsapp = _whatsapp and lower(c.email) = lower(_email) then 'WhatsApp e e-mail'
      when c.whatsapp = _whatsapp then 'WhatsApp'
      else 'E-mail'
    end
  from public.clients c
  where c.deleted_at is null
    and (_exclude is null or c.id <> _exclude)
    and (c.whatsapp = _whatsapp or lower(c.email) = lower(_email));
end;
$$;

revoke all on function public.find_duplicates(text, text, uuid) from public;
grant execute on function public.find_duplicates(text, text, uuid) to authenticated, service_role;

create or replace function public.generate_monthly_revenues(_month date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Apenas administradores';
  end if;

  insert into public.monthly_revenues (
    client_id, reference_month, bill_amount, percent, revenue, is_estimate
  )
  select
    c.id,
    date_trunc('month', _month)::date,
    c.avg_bill,
    0.04,
    round((c.avg_bill * 0.04)::numeric, 2),
    true
  from public.clients c
  where c.status = 'cliente_ativo'
    and c.avg_bill is not null
    and c.deleted_at is null
  on conflict (client_id, reference_month) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.generate_monthly_revenues(date) from public;
grant execute on function public.generate_monthly_revenues(date) to authenticated, service_role;

alter table public.leads enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.clients enable row level security;
alter table public.client_documents enable row level security;
alter table public.client_history enable row level security;
alter table public.bonuses enable row level security;
alter table public.monthly_revenues enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.user_roles, public.clients, public.client_documents, public.client_history, public.bonuses, public.monthly_revenues to authenticated;
grant all on public.leads, public.profiles, public.user_roles, public.clients, public.client_documents, public.client_history, public.bonuses, public.monthly_revenues to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

drop policy if exists "Anyone can insert leads" on public.leads;
create policy "Anyone can insert leads" on public.leads
  for insert to anon, authenticated
  with check (true);

drop policy if exists profiles_select_members on public.profiles;
create policy profiles_select_members on public.profiles
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists user_roles_select_members on public.user_roles;
create policy user_roles_select_members on public.user_roles
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists clients_select_members on public.clients;
create policy clients_select_members on public.clients
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists clients_insert_members on public.clients;
create policy clients_insert_members on public.clients
  for insert to authenticated
  with check (public.is_member(auth.uid()) and created_by = auth.uid());

drop policy if exists clients_update_members on public.clients;
create policy clients_update_members on public.clients
  for update to authenticated
  using (public.is_member(auth.uid()))
  with check (public.is_member(auth.uid()));

drop policy if exists clients_delete_admin on public.clients;
create policy clients_delete_admin on public.clients
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists documents_select_members on public.client_documents;
create policy documents_select_members on public.client_documents
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists documents_insert_members on public.client_documents;
create policy documents_insert_members on public.client_documents
  for insert to authenticated
  with check (public.is_member(auth.uid()) and uploaded_by = auth.uid());

drop policy if exists documents_update_members on public.client_documents;
create policy documents_update_members on public.client_documents
  for update to authenticated
  using (public.is_member(auth.uid()))
  with check (public.is_member(auth.uid()));

drop policy if exists history_select_members on public.client_history;
create policy history_select_members on public.client_history
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists history_insert_members on public.client_history;
create policy history_insert_members on public.client_history
  for insert to authenticated
  with check (public.is_member(auth.uid()) and user_id = auth.uid());

drop policy if exists bonuses_select_members on public.bonuses;
create policy bonuses_select_members on public.bonuses
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists bonuses_update_admin on public.bonuses;
create policy bonuses_update_admin on public.bonuses
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists revenue_select_members on public.monthly_revenues;
create policy revenue_select_members on public.monthly_revenues
  for select to authenticated
  using (public.is_member(auth.uid()));

drop policy if exists revenue_update_admin on public.monthly_revenues;
create policy revenue_update_admin on public.monthly_revenues
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

insert into storage.buckets (id, name, public)
values ('client-docs', 'client-docs', false)
on conflict (id) do update set public = false;

drop policy if exists client_docs_read_members on storage.objects;
create policy client_docs_read_members on storage.objects
  for select to authenticated
  using (bucket_id = 'client-docs' and public.is_member(auth.uid()));

drop policy if exists client_docs_insert_members on storage.objects;
create policy client_docs_insert_members on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-docs' and public.is_member(auth.uid()));

drop policy if exists client_docs_update_members on storage.objects;
create policy client_docs_update_members on storage.objects
  for update to authenticated
  using (bucket_id = 'client-docs' and public.is_member(auth.uid()))
  with check (bucket_id = 'client-docs' and public.is_member(auth.uid()));

insert into public.profiles (id, email, full_name, active)
select id, coalesce(email, ''), coalesce(raw_user_meta_data ->> 'full_name', ''), true
from auth.users
where lower(email) = 'clayverson02@gmail.com'
on conflict (id) do update set email = excluded.email, active = true;

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = 'clayverson02@gmail.com'
on conflict (user_id, role) do nothing;
