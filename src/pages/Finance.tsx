import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBonuses, useClients, useProfiles, useRevenues } from "@/hooks/useCrmData";
import { BONUS_AMOUNT, brl, fmtDate, fmtMonth } from "@/lib/crm";
import { Empty, Loading, PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Finance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: bonuses, isLoading } = useBonuses();
  const { data: revenues = [] } = useRevenues();
  const { data: clients = [] } = useClients();
  const { data: profiles = [] } = useProfiles();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const cname = (id: string) => clients.find((c) => c.id === id)?.full_name ?? "(arquivado)";
  const pname = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || "—";

  const pend = (bonuses ?? []).filter((b) => b.status === "pendente");
  const conf = (bonuses ?? []).filter((b) => b.status === "confirmada");
  const monthRev = revenues.filter((r) => r.reference_month.startsWith(month));

  const confirm = async (id: string) => {
    const { error } = await supabase.from("bonuses").update({ status: "confirmada", confirmed_by: user!.id, confirmed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Bonificação confirmada"); qc.invalidateQueries({ queryKey: ["bonuses"] });
  };
  const generate = async () => {
    const { data, error } = await supabase.rpc("generate_monthly_revenues", { _month: `${month}-01` });
    if (error) return toast.error(error.message);
    toast.success(`${data} registro(s) criado(s) para clientes ativos com fatura informada`);
    qc.invalidateQueries({ queryKey: ["revenues"] });
  };
  const updateRev = async (id: string, patch: { bill_amount?: number; receipt_status?: string; notes?: string; is_estimate?: boolean }) => {
    const { error } = await supabase.from("monthly_revenues").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["revenues"] });
  };

  if (isLoading) return <Loading />;
  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Valores em receita bruta (custos ainda não cadastrados)" />
      <Tabs defaultValue="bonus">
        <TabsList className="mb-4"><TabsTrigger value="bonus">Bonificações</TabsTrigger><TabsTrigger value="mensal">Controle mensal</TabsTrigger></TabsList>
        <TabsContent value="bonus">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-xl font-bold">{pend.length} · {brl(pend.length * BONUS_AMOUNT)}</p></div>
            <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Confirmadas</p><p className="text-xl font-bold">{conf.length} · {brl(conf.length * BONUS_AMOUNT)}</p></div>
            <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Total ({(bonuses ?? []).length} validados × {brl(BONUS_AMOUNT)})</p><p className="text-xl font-bold text-success">{brl((bonuses ?? []).length * BONUS_AMOUNT)}</p></div>
          </div>
          {!(bonuses ?? []).length ? <Empty title="Nenhuma bonificação ainda">Bonificações são geradas ao atingir “Cadastro concluído”.</Empty> : (
            <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Data</th><th>Cliente</th><th>Funcionário</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
              <tbody>{bonuses!.map((b) => <tr key={b.id} className="border-t"><td className="px-3 py-2">{fmtDate(b.created_at)}</td><td><Link className="hover:text-primary" to={`/clientes/${b.client_id}`}>{cname(b.client_id)}</Link></td><td>{pname(b.responsible_id)}</td><td>{brl(b.amount)}</td>
                <td>{b.status === "confirmada" ? `Confirmada ${fmtDate(b.confirmed_at)}` : "Pendente"}</td><td className="pr-3 text-right">{b.status === "pendente" && <Button size="sm" onClick={() => confirm(b.id)}>Confirmar</Button>}</td></tr>)}</tbody></table></div>
          )}
        </TabsContent>
        <TabsContent value="mensal">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div><p className="mb-1 text-xs text-muted-foreground">Mês de referência</p><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" /></div>
            <Button onClick={generate}>Gerar registros do mês (clientes ativos)</Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Registros gerados usam o valor médio como “estimativa”. Ao informar o valor real da fatura, o registro passa a “real”. Percentual fixo de 4%.</p>
          {!monthRev.length ? <Empty title="Sem registros para este mês" /> : (
            <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Cliente</th><th>Mês</th><th>Valor da fatura</th><th>%</th><th>Receita</th><th>Tipo</th><th>Recebimento</th><th>Obs.</th></tr></thead>
              <tbody>{monthRev.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{cname(r.client_id)}</td><td className="capitalize">{fmtMonth(r.reference_month)}</td>
                  <td><Input className="h-8 w-28" defaultValue={r.bill_amount} inputMode="decimal" onBlur={(e) => { const v = Number(e.target.value.replace(",", ".")); if (!isNaN(v) && v >= 0 && v !== Number(r.bill_amount)) updateRev(r.id, { bill_amount: v, is_estimate: false }); }} /></td>
                  <td>4%</td><td className="font-semibold text-success">{brl(r.revenue)}</td><td>{r.is_estimate ? "Estimativa" : "Real"}</td>
                  <td><Button size="sm" variant={r.receipt_status === "recebido" ? "secondary" : "outline"} onClick={() => updateRev(r.id, { receipt_status: r.receipt_status === "recebido" ? "pendente" : "recebido" })}>{r.receipt_status === "recebido" ? "Recebido" : "Pendente"}</Button></td>
                  <td className="pr-3"><Input className="h-8 w-40" defaultValue={r.notes ?? ""} maxLength={500} onBlur={(e) => e.target.value !== (r.notes ?? "") && updateRev(r.id, { notes: e.target.value })} /></td>
                </tr>))}</tbody></table></div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
