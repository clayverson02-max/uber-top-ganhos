-- Substitui a bonificação fixa por cliente pelo acompanhamento de metas.
-- A recorrência mensal de 4% continua sendo gerada para clientes ativos.

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

  if is_activation
     and new.avg_bill is not null
     and new.avg_bill > 0 then
    insert into public.monthly_revenues (
      client_id,
      reference_month,
      bill_amount,
      percent,
      revenue,
      is_estimate
    )
    values (
      new.id,
      date_trunc('month', now())::date,
      new.avg_bill,
      0.04,
      round((new.avg_bill * 0.04)::numeric, 2),
      true
    )
    on conflict (client_id, reference_month) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_client_status() from public, anon, authenticated;
grant execute on function public.handle_client_status() to service_role;
