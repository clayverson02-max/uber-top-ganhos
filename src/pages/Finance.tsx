import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useProfiles, useRevenues } from "@/hooks/useCrmData";
import {
  COMMISSION_GOALS,
  brl,
  fmtMonth,
  getCommissionGoal,
  getNextCommissionGoal,
} from "@/lib/crm";
import { Empty, Loading, PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Finance() {
  const qc = useQueryClient();
  const { data: revenues = [] } = useRevenues();
  const { data: clients = [] } = useClients();
  const { data: profiles = [] } = useProfiles();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const cname = (id: string) => clients.find((c) => c.id === id)?.full_name ?? "(arquivado)";
  const pname = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || "—";
  const activePeople = clients.filter((client) => client.status === "cliente_ativo").length;
  const currentCommission = getCommissionGoal(activePeople);
  const nextGoal = getNextCommissionGoal(activePeople);
  const goalProgress = nextGoal
    ? Math.min(100, Math.round((activePeople / nextGoal.people) * 100))
    : 100;
  const monthRev = revenues.filter((r) => r.reference_month.startsWith(month));

  const generate = async () => {
    const { data, error } = await supabase.rpc("generate_monthly_revenues", { _month: `${month}-01` });
    if (error) return toast.error(error.message);
    toast.success(`${data} registro(s) criado(s) para clientes ativos com fatura informada`);
    qc.invalidateQueries({ queryKey: ["revenues"] });
  };

  const updateRev = async (
    id: string,
    patch: { bill_amount?: number; receipt_status?: string; notes?: string; is_estimate?: boolean }
  ) => {
    const { error } = await supabase.from("monthly_revenues").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["revenues"] });
  };

  return (
    <div>
      <PageHeader
        title="Financeiro"
        subtitle="Comissões por metas + recorrência mensal de 4% das faturas"
      />

      <Tabs defaultValue="metas">
        <TabsList className="mb-4">
          <TabsTrigger value="metas">Metas de comissão</TabsTrigger>
          <TabsTrigger value="mensal">Recorrência mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="metas">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Pessoas ativas</p>
              <p className="text-xl font-bold">{activePeople}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Comissão de meta atual</p>
              <p className="text-xl font-bold text-success">{brl(currentCommission)}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">Próxima meta</p>
              <p className="text-xl font-bold">
                {nextGoal ? `${nextGoal.people} pessoas` : "Todas atingidas"}
              </p>
              {nextGoal && (
                <p className="text-xs text-muted-foreground">{brl(nextGoal.amount)}</p>
              )}
            </div>
          </div>

          <div className="mb-4 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-bold">Progresso até a próxima meta</p>
              <span className="font-semibold text-primary">{goalProgress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {nextGoal
                ? `${Math.max(nextGoal.people - activePeople, 0)} pessoa(s) faltando para ${brl(nextGoal.amount)}.`
                : "Parabéns: todas as metas cadastradas foram atingidas."}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Meta</th>
                  <th>Comissão</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_GOALS.map((goal) => {
                  const reached = activePeople >= goal.people;
                  return (
                    <tr key={goal.people} className="border-t">
                      <td className="px-3 py-2 font-semibold">{goal.people} pessoas</td>
                      <td>{brl(goal.amount)}</td>
                      <td className={reached ? "font-semibold text-success" : "text-muted-foreground"}>
                        {reached ? "Meta atingida" : `${goal.people - activePeople} faltando`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            O cálculo considera somente clientes ativos. A recorrência de 4% é controlada separadamente na aba mensal.
          </p>
        </TabsContent>

        <TabsContent value="mensal">
          <div className="mb-4 flex flex-wrap items-end gap-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Mês de referência</p>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            </div>
            <Button onClick={generate}>Gerar registros do mês (clientes ativos)</Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            A comissão recorrente é de 4% do valor pago na fatura mensal. O valor médio informado entra como estimativa até ser atualizado.
          </p>
          {!monthRev.length ? (
            <Empty title="Sem registros para este mês" />
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Cliente</th>
                    <th>Mês</th>
                    <th>Valor da fatura</th>
                    <th>%</th>
                    <th>Comissão</th>
                    <th>Tipo</th>
                    <th>Recebimento</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRev.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link className="hover:text-primary" to={`/clientes/${r.client_id}`}>
                          {cname(r.client_id)}
                        </Link>
                      </td>
                      <td className="capitalize">{fmtMonth(r.reference_month)}</td>
                      <td>
                        <Input
                          className="h-8 w-28"
                          defaultValue={r.bill_amount}
                          inputMode="decimal"
                          onBlur={(e) => {
                            const v = Number(e.target.value.replace(",", "."));
                            if (!isNaN(v) && v >= 0 && v !== Number(r.bill_amount)) {
                              updateRev(r.id, { bill_amount: v, is_estimate: false });
                            }
                          }}
                        />
                      </td>
                      <td>4%</td>
                      <td className="font-semibold text-success">{brl(r.revenue)}</td>
                      <td>{r.is_estimate ? "Estimativa" : "Real"}</td>
                      <td>
                        <Button
                          size="sm"
                          variant={r.receipt_status === "recebido" ? "secondary" : "outline"}
                          onClick={() =>
                            updateRev(r.id, {
                              receipt_status: r.receipt_status === "recebido" ? "pendente" : "recebido",
                            })
                          }
                        >
                          {r.receipt_status === "recebido" ? "Recebido" : "Pendente"}
                        </Button>
                      </td>
                      <td className="pr-3">
                        <Input
                          className="h-8 w-40"
                          defaultValue={r.notes ?? ""}
                          maxLength={500}
                          onBlur={(e) =>
                            e.target.value !== (r.notes ?? "") &&
                            updateRev(r.id, { notes: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
