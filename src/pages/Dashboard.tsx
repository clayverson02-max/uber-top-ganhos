import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useBonuses, useClients, useDocs, useProfiles, useRevenues } from "@/hooks/useCrmData";
import { BONUS_AMOUNT, STATUSES, brl, isPotential, statusColor, statusLabel } from "@/lib/crm";
import { Loading, PageHeader } from "@/components/crm/States";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mk = (d: string) => d.slice(0, 7);
const mLabel = (k: string) => { const [y, m] = k.split("-"); return `${m}/${y.slice(2)}`; };

export default function Dashboard() {
  const { data: clientsAll, isLoading } = useClients();
  const { data: docs = [] } = useDocs();
  const { data: bonusesAll = [] } = useBonuses();
  const { data: revenues = [] } = useRevenues();
  const { data: profiles = [] } = useProfiles();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [st, setSt] = useState("all");
  const [or, setOr] = useState("all");
  const [emp, setEmp] = useState("all");

  const d = useMemo(() => {
    const inP = (iso: string) => (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to);
    const clients = (clientsAll ?? []).filter((c) => inP(c.created_at) && (st === "all" || c.status === st) && (or === "all" || c.origin === or) && (emp === "all" || c.responsible_id === emp || c.created_by === emp));
    const ids = new Set(clients.map((c) => c.id));
    const curDocs = docs.filter((x) => x.is_current && ids.has(x.client_id));
    const bonuses = bonusesAll.filter((b) => ids.has(b.client_id) && inP(b.created_at));
    const revs = revenues.filter((r) => ids.has(r.client_id));
    const ativos = clients.filter((c) => c.status === "cliente_ativo");
    const thisMonth = new Date().toISOString().slice(0, 7);
    const withBill = ativos.filter((c) => c.avg_bill != null);
    const byMonth: Record<string, number> = {};
    clients.forEach((c) => (byMonth[mk(c.created_at)] = (byMonth[mk(c.created_at)] ?? 0) + 1));
    const revMonth: Record<string, { estimada: number; realizada: number }> = {};
    revs.forEach((r) => { const k = mk(r.reference_month); revMonth[k] ??= { estimada: 0, realizada: 0 }; revMonth[k].estimada += Number(r.revenue); if (r.receipt_status === "recebido") revMonth[k].realizada += Number(r.revenue); });
    const bonMonth: Record<string, number> = {};
    bonuses.forEach((b) => (bonMonth[mk(b.created_at)] = (bonMonth[mk(b.created_at)] ?? 0) + Number(b.amount)));
    const byEmp: Record<string, number> = {};
    clients.forEach((c) => { const n = profiles.find((p) => p.id === c.created_by)?.full_name || "—"; byEmp[n] = (byEmp[n] ?? 0) + 1; });
    return {
      cards: [
        ["Potenciais clientes", clients.filter((c) => isPotential(c.status)).length],
        ["Clientes cadastrados", clients.filter((c) => ["cadastro_concluido", "cliente_ativo", "cliente_inativo"].includes(c.status)).length],
        ["Clientes ativos", ativos.length],
        ["Clientes inativos", clients.filter((c) => c.status === "cliente_inativo").length],
        ["Documentos pendentes", clients.length * 2 - curDocs.length + curDocs.filter((x) => x.status === "pendente").length],
        ["Documentos em análise", curDocs.filter((x) => x.status === "em_analise").length],
        ["Não prosseguiram", clients.filter((c) => c.status === "nao_prosseguiu").length],
        ["Total de bonificações", brl(bonuses.length * BONUS_AMOUNT)],
        ["Receita estimada do mês", brl(revs.filter((r) => mk(r.reference_month) === thisMonth).reduce((s, r) => s + Number(r.revenue), 0) || withBill.reduce((s, c) => s + Number(c.avg_bill) * 0.04, 0))],
        ["Receita realizada", brl(revs.filter((r) => r.receipt_status === "recebido").reduce((s, r) => s + Number(r.revenue), 0))],
        ["Receita bruta acumulada", brl(revs.filter((r) => r.receipt_status === "recebido").reduce((s, r) => s + Number(r.revenue), 0) + bonuses.filter((b) => b.status === "confirmada").length * BONUS_AMOUNT)],
        ["Média das faturas (ativos)", brl(withBill.length ? withBill.reduce((s, c) => s + Number(c.avg_bill), 0) / withBill.length : null)],
      ] as [string, string | number][],
      byMonth: Object.keys(byMonth).sort().map((k) => ({ mes: mLabel(k), cadastros: byMonth[k] })),
      byStatus: STATUSES.map((s) => ({ key: s.value, name: s.label, value: clients.filter((c) => c.status === s.value).length })).filter((x) => x.value),
      byOrigin: [{ name: "Anúncio", value: clients.filter((c) => c.origin === "anuncio").length }, { name: "WhatsApp", value: clients.filter((c) => c.origin === "whatsapp").length }],
      revMonth: Object.keys(revMonth).sort().map((k) => ({ mes: mLabel(k), ...revMonth[k] })),
      bonMonth: Object.keys(bonMonth).sort().map((k) => ({ mes: mLabel(k), valor: bonMonth[k] })),
      byEmp: Object.entries(byEmp).map(([name, v]) => ({ name, cadastros: v })),
      ativosInativos: [{ name: "Ativos", value: ativos.length }, { name: "Inativos", value: clients.filter((c) => c.status === "cliente_inativo").length }],
    };
  }, [clientsAll, docs, bonusesAll, revenues, profiles, from, to, st, or, emp]);

  if (isLoading) return <Loading />;
  const Box = ({ title, children }: { title: string; children: React.ReactElement }) => (
    <div className="rounded-xl border bg-card p-4"><p className="mb-3 text-sm font-bold">{title}</p><div className="h-60"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>
  );
  const P = "hsl(var(--primary))", G = "hsl(var(--secondary))", Y = "hsl(var(--accent))", M = "hsl(var(--muted-foreground))";

  return (
    <div>
      <PageHeader title="Dashboard geral" subtitle="Visão da operação Conta Amiga" />
      <div className="mb-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
        <Select value={st} onValueChange={setSt}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
        <Select value={or} onValueChange={setOr}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as origens</SelectItem><SelectItem value="anuncio">Anúncio</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select>
        <Select value={emp} onValueChange={setEmp}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os funcionários</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {d.cards.map(([l, v], i) => (
          <div key={l} className="rounded-xl border bg-card p-4" style={{ borderTop: `3px solid ${i < 7 ? P : i < 8 ? Y : G}` }}>
            <p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Cadastros por mês"><BarChart data={d.byMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="cadastros" fill={P} radius={4} /></BarChart></Box>
        <Box title="Clientes por status"><PieChart><Pie data={d.byStatus} dataKey="value" nameKey="name" outerRadius={85}>{d.byStatus.map((s) => <Cell key={s.key} fill={statusColor(s.key)} />)}</Pie><Tooltip formatter={(v, n) => [v, statusLabel(String(n) as never) ?? n]} /></PieChart></Box>
        <Box title="Clientes por origem"><PieChart><Pie data={d.byOrigin} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85}><Cell fill={P} /><Cell fill={G} /></Pie><Legend /><Tooltip /></PieChart></Box>
        <Box title="Receita mensal (bruta)"><LineChart data={d.revMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => brl(Number(v))} /><Legend /><Line dataKey="estimada" stroke={P} strokeWidth={2} /><Line dataKey="realizada" stroke={G} strokeWidth={2} /></LineChart></Box>
        <Box title="Bonificações por período"><BarChart data={d.bonMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => brl(Number(v))} /><Bar dataKey="valor" fill={Y} radius={4} /></BarChart></Box>
        <Box title="Cadastros por funcionário"><BarChart data={d.byEmp} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="name" width={90} fontSize={11} /><Tooltip /><Bar dataKey="cadastros" fill={P} radius={4} /></BarChart></Box>
        <Box title="Ativos e inativos"><PieChart><Pie data={d.ativosInativos} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85}><Cell fill={G} /><Cell fill={M} /></Pie><Legend /><Tooltip /></PieChart></Box>
      </div>
    </div>
  );
}
