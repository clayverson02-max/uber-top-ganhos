-- Chat interno por cliente e proteção da lixeira.
create table if not exists public.client_messages (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_client_messages_client_created
  on public.client_messages(client_id, created_at asc);

alter table public.client_messages enable row level security;

grant select, insert on public.client_messages to authenticated;
grant all on public.client_messages to service_role;

drop policy if exists client_messages_select_members on public.client_messages;
create policy client_messages_select_members on public.client_messages
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
    or exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.created_by = auth.uid()
    )
  );

drop policy if exists client_messages_insert_members on public.client_messages;
create policy client_messages_insert_members on public.client_messages
  for insert to authenticated
  with check (
    public.is_member(auth.uid())
    and sender_id = auth.uid()
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and (
          c.created_by = auth.uid()
          or public.has_role(auth.uid(), 'admin'::public.app_role)
          or public.has_role(auth.uid(), 'interno'::public.app_role)
        )
    )
  );

create or replace function public.protect_client_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Somente o administrador pode usar a lixeira';
  end if;
  return new;
end;
$$;

revoke all on function public.protect_client_archive() from public, anon, authenticated;
grant execute on function public.protect_client_archive() to service_role;

drop trigger if exists clients_protect_archive on public.clients;
create trigger clients_protect_archive
  before update on public.clients
  for each row execute procedure public.protect_client_archive();
