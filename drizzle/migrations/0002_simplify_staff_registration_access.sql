-- Restringe o painel da equipe ao cadastro de clientes e registra o funcionário autorizado.
-- O administrador continua com acesso completo.

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
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
  elsif lower(coalesce(new.email, '')) = 'clayverson06@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'equipe'::public.app_role)
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_client_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_activation boolean := false;
begin
  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.client_history (client_id, user_id, kind, description)
      values (new.id, auth.uid(), 'status', 'Status alterado para ' || new.status::text);
    end if;

    is_activation := new.status in ('cadastro_concluido', 'cliente_ativo')
      and old.status is distinct from new.status;
  else
    is_activation := new.status in ('cadastro_concluido', 'cliente_ativo');
  end if;

  if is_activation then
    insert into public.bonuses (client_id, responsible_id, amount)
    values (new.id, coalesce(new.responsible_id, new.created_by), 25)
    on conflict (client_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_client_status() from public;
grant execute on function public.handle_client_status() to authenticated, service_role;

drop policy if exists profiles_select_members on public.profiles;
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists user_roles_select_members on public.user_roles;
drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin on public.user_roles
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists clients_select_members on public.clients;
drop policy if exists clients_select_own_or_admin on public.clients;
create policy clients_select_own_or_admin on public.clients
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists clients_update_members on public.clients;
drop policy if exists clients_update_admin on public.clients;
create policy clients_update_admin on public.clients
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists documents_select_members on public.client_documents;
drop policy if exists documents_select_admin on public.client_documents;
create policy documents_select_admin on public.client_documents
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists documents_update_members on public.client_documents;
drop policy if exists documents_update_admin on public.client_documents;
create policy documents_update_admin on public.client_documents
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists documents_insert_members on public.client_documents;
create policy documents_insert_members on public.client_documents
  for insert to authenticated
  with check (public.is_member(auth.uid()) and uploaded_by = auth.uid());

drop policy if exists history_select_members on public.client_history;
drop policy if exists history_select_admin on public.client_history;
create policy history_select_admin on public.client_history
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists history_insert_members on public.client_history;
create policy history_insert_members on public.client_history
  for insert to authenticated
  with check (public.is_member(auth.uid()) and user_id = auth.uid());

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

drop policy if exists client_docs_read_members on storage.objects;
drop policy if exists client_docs_read_admin on storage.objects;
create policy client_docs_read_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-docs'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists client_docs_update_members on storage.objects;
drop policy if exists client_docs_update_admin on storage.objects;
create policy client_docs_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'client-docs'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  with check (
    bucket_id = 'client-docs'
    and public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists client_docs_insert_members on storage.objects;
create policy client_docs_insert_members on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-docs'
    and public.is_member(auth.uid())
  );

insert into public.profiles (id, email, full_name, active)
select
  id,
  coalesce(email, ''),
  coalesce(nullif(raw_user_meta_data ->> 'full_name', ''), 'Equipe'),
  true
from auth.users
where lower(email) = 'clayverson06@gmail.com'
on conflict (id) do update
  set email = excluded.email,
      active = true,
      full_name = case
        when public.profiles.full_name is null or public.profiles.full_name = ''
          then excluded.full_name
        else public.profiles.full_name
      end;

insert into public.user_roles (user_id, role)
select id, 'equipe'::public.app_role
from auth.users
where lower(email) = 'clayverson06@gmail.com'
on conflict (user_id, role) do nothing;
