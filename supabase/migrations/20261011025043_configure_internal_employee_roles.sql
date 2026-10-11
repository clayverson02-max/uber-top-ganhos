-- Perfil e permissões do funcionário interno.
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
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'Equipe'),
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        active = true;

  if lower(coalesce(new.email, '')) = 'clayverson02@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  elsif lower(coalesce(new.email, '')) = 'clayverson06@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'equipe'::public.app_role)
    on conflict (user_id, role) do nothing;
  elsif lower(coalesce(new.email, '')) = 'advanceofseals01@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'interno'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

insert into public.profiles (id, email, full_name, active)
select
  id,
  coalesce(email, ''),
  coalesce(
    nullif(raw_user_meta_data ->> 'full_name', ''),
    case
      when lower(email) = 'clayverson02@gmail.com' then 'Clayverson'
      when lower(email) = 'clayverson06@gmail.com' then 'Equipe de rua'
      else 'Equipe interna'
    end
  ),
  true
from auth.users
where lower(email) in (
  'clayverson02@gmail.com',
  'clayverson06@gmail.com',
  'advanceofseals01@gmail.com'
)
on conflict (id) do update
  set email = excluded.email,
      active = true;

insert into public.user_roles (user_id, role)
select id, 'interno'::public.app_role
from auth.users
where lower(email) = 'advanceofseals01@gmail.com'
on conflict (user_id, role) do nothing;

drop policy if exists profiles_select_members on public.profiles;
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_members on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  );

drop policy if exists clients_select_members on public.clients;
drop policy if exists clients_select_own_or_admin on public.clients;
create policy clients_select_members on public.clients
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  );

drop policy if exists clients_update_members on public.clients;
drop policy if exists clients_update_admin on public.clients;
drop policy if exists clients_update_ops on public.clients;
create policy clients_update_ops on public.clients
  for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  );

drop policy if exists documents_select_members on public.client_documents;
drop policy if exists documents_select_admin on public.client_documents;
drop policy if exists documents_select_ops on public.client_documents;
create policy documents_select_ops on public.client_documents
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  );

drop policy if exists documents_update_members on public.client_documents;
drop policy if exists documents_update_admin on public.client_documents;
drop policy if exists documents_update_ops on public.client_documents;
create policy documents_update_ops on public.client_documents
  for update to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  )
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  );

drop policy if exists history_select_members on public.client_history;
drop policy if exists history_select_admin on public.client_history;
drop policy if exists history_select_ops on public.client_history;
create policy history_select_ops on public.client_history
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'interno'::public.app_role)
  );

drop policy if exists bonuses_select_members on public.bonuses;
drop policy if exists bonuses_select_admin on public.bonuses;
create policy bonuses_select_admin on public.bonuses
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists revenue_select_members on public.monthly_revenues;
drop policy if exists revenue_select_admin on public.monthly_revenues;
create policy revenue_select_admin on public.monthly_revenues
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
