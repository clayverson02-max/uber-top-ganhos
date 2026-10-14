import { useMemo, useState, type ElementType, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Clock3,
  DollarSign,
  FileWarning,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useClients, useDocs, useProfiles, useRevenues } from "@/hooks/useCrmData";
import {
  COMMISSION_GOALS,
  DOC_TYPES,
  REVENUE_PERCENT,
  STATUSES,
  brl,
  getCommissionGoal,
  getNextCommissionGoal,
  isPotential,
  statusColor,
  statusLabel,
} from "@/lib/crm";
import { Loading, PageHeader } from "@/components/crm/States";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mk = (d: string) => d.slice(0, 7);
const mLabel = (k: string) => {
  const [y, m] = k.split("-");
  return m + "/" + y.slice(2);
};

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
  info: "bg-sky-500/10 text-sky-600",
  neutral: "bg-muted text-muted-foreground",
} as const;

type Tone = keyof typeof toneClasses;

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: ElementType;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight">{value}</p>
          {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
        </div>
        <div className={["shrink-0 rounded-xl p-2.5", toneClasses[tone]].join(" ")}>
          <Icon size={19} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}

function GoalCard({
  people,
  amount,
  activePeople,
}: {
  people: number;
  amount: number;
  activePeople: number;
}) {
  const reached = activePeople >= people;
  const progress = Math.min(100, Math.round((activePeople / people) * 100));
  const missing = Math.max(people - activePeople, 0);

  return (
    <div className={["rounded-2xl border p-4", reached ? "border-emerald-500/40 bg-emerald-500/5" : "bg-background"].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{people} pessoas</p>
          <p className="mt-1 text-lg font-extrabold text-primary">{brl(amount)}</p>
        </div>
        <div className={["rounded-full p-1.5", reached ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"].join(" ")}>
          <CheckCircle2 size={16} />
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={["h-full rounded-full transition-all", reached ? "bg-emerald-500" : "bg-primary"].join(" ")}
          style={{ width: progress + "%" }}
        />
      </div>
      <p className={["mt-2 text-xs", reached ? "font-semibold text-emerald-600" : "text-muted-foreground"].join(" ")}>
        {reached ? "Meta atingida" : missing + " pessoa(s) faltando"}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data: clientsAll, isLoading } = useClients();
  const { data: docs = [] } = useDocs();
  const { data: revenues = [] } = useRevenues();
  const { data: profiles = [] } = useProfiles();
  const { data: employeeGoals = [] } = useQuery({
    queryKey: ["employee-goals-dashboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("employee_goals").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [performanceMonth, setPerformanceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [st, setSt] = useState("all");
  const [or, setOr] = useState("all");
  const [emp, setEmp] = useState("all");

  const d = useMemo(() => {
    const inP = (iso: string) =>
      (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to);
    const clients = (clientsAll ?? []).filter(
      (c) =>
        inP(c.created_at) &&
        (st === "all" || c.status === st) &&
        (or === "all" || c.origin === or) &&
        (emp === "all" || c.responsible_id === emp || c.created_by === emp)
    );
    const ids = new Set(clients.map((c) => c.id));
    const curDocs = docs.filter((x) => x.is_current && ids.has(x.client_id));
    const revs = revenues.filter((r) => ids.has(r.client_id));
    const ativos = clients.filter((c) => c.status === "cliente_ativo");
    const withBill = ativos.filter((c) => c.avg_bill != null);
    const nextGoal = getNextCommissionGoal(ativos.length);
    const pendingStatuses = new Set([
      "aguardando_documentos",
      "documentos_recebidos",
      "documentos_em_analise",
    ]);
    const pendingApproval = clients.filter((c) => pendingStatuses.has(c.status)).length;
    const documentsPending = clients.reduce((total, client) => {
      const current = curDocs.filter((doc) => doc.client_id === client.id);
      const missing = (Object.keys(DOC_TYPES) as Array<keyof typeof DOC_TYPES>).filter(
        (type) => !current.some((doc) => doc.doc_type === type && doc.status !== "rejeitado")
      ).length;
      const waiting = current.filter((doc) => doc.status === "pendente" || doc.status === "em_analise").length;
      return total + missing + waiting;
    }, 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthlyRecurringEstimate = withBill.reduce(
      (sum, client) => sum + Number(client.avg_bill) * REVENUE_PERCENT,
      0
    );
    const accumulatedRecurring = revs.reduce((sum, revenue) => sum + Number(revenue.revenue), 0);
    const receivedRecurring = revs
      .filter((revenue) => revenue.receipt_status === "recebido")
      .reduce((sum, revenue) => sum + Number(revenue.revenue), 0);
    const byMonth: Record<string, number> = {};
    clients.forEach((c) => {
      byMonth[mk(c.created_at)] = (byMonth[mk(c.created_at)] ?? 0) + 1;
    });
    const revMonth: Record<string, { estimada: number; realizada: number }> = {};
    revs.forEach((r) => {
      const k = mk(r.reference_month);
      revMonth[k] ??= { estimada: 0, realizada: 0 };
      revMonth[k].estimada += Number(r.revenue);
      if (r.receipt_status === "recebido") revMonth[k].realizada += Number(r.revenue);
    });
    const byEmp: Record<string, number> = {};
    clients.forEach((c) => {
      const n = profiles.find((p) => p.id === c.created_by)?.full_name || "—";
      byEmp[n] = (byEmp[n] ?? 0) + 1;
    });

    return {
      total: clients.length,
      activeCount: ativos.length,
      pendingApproval,
      documentsPending,
      monthlyRecurringEstimate,
      accumulatedRecurring,
      receivedRecurring,
      currentGoal: getCommissionGoal(ativos.length),
      nextGoal,
      goalProgress: nextGoal
        ? Math.min(100, Math.round((ativos.length / nextGoal.people) * 100))
        : 100,
      byMonth: Object.keys(byMonth)
        .sort()
        .map((k) => ({ mes: mLabel(k), cadastros: byMonth[k] })),
      byStatus: STATUSES.map((s) => ({
        key: s.value,
        name: s.label,
        value: clients.filter((c) => c.status === s.value).length,
      })).filter((x) => x.value),
      byOrigin: [
        { name: "Anúncio", value: clients.filter((c) => c.origin === "anuncio").length },
        { name: "WhatsApp", value: clients.filter((c) => c.origin === "whatsapp").length },
      ],
      revMonth: Object.keys(revMonth)
        .sort()
        .map((k) => ({ mes: mLabel(k), ...revMonth[k] })),
      byEmp: Object.entries(byEmp).map(([name, v]) => ({ name, cadastros: v })),
      employeePerformance: profiles.map((profile) => {
        const count = (clientsAll ?? []).filter((client) => mk(client.created_at) === performanceMonth && (client.responsible_id || client.created_by) === profile.id).length;
        const goal = Number(employeeGoals.find((item: any) => item.user_id === profile.id)?.monthly_goal ?? 0);
        return { id: profile.id, name: profile.display_name || profile.full_name || profile.email, count, goal, percentage: goal > 0 ? Math.min(100, Math.round((count / goal) * 100)) : 0 };
      }).filter((item) => item.goal > 0 || item.count > 0),
      ativosInativos: [
        { name: "Ativos", value: ativos.length },
        {
          name: "Inativos",
          value: clients.filter((c) => c.status === "cliente_inativo").length,
        },
      ],
      estimatedMonth: revs
        .filter((r) => mk(r.reference_month) === thisMonth)
        .reduce((sum, r) => sum + Number(r.revenue), 0),
      averageBill: withBill.length
        ? withBill.reduce((sum, client) => sum + Number(client.avg_bill), 0) / withBill.length
        : null,
    };
  }, [clientsAll, docs, revenues, profiles, employeeGoals, performanceMonth, from, to, st, or, emp]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousDate = new Date();
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousMonth = previousDate.toISOString().slice(0, 7);
  if (isLoading) return <Loading />;

  const Box = ({ title, children }: { title: string; children: ReactElement }) => (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-bold">{title}</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
  const P = "hsl(var(--primary))";
  const G = "hsl(var(--secondary))";
  const M = "hsl(var(--muted-foreground))";

  return (
    <div>
      <PageHeader
        title="Dashboard geral"
        subtitle="Clientes, pendências, metas e recorrência em um só lugar"
      />

      <div className="mb-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Painel do ADM</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight">Visão rápida da operação</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe entradas, pendências e o valor que a base pode gerar.
            </p>
          </div>
          <div className="rounded-xl border bg-background px-4 py-3 sm:min-w-40">
            <p className="text-xs text-muted-foreground">Base no filtro atual</p>
            <p className="mt-1 text-lg font-extrabold">{d.total} cliente(s)</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Clientes que entraram"
            value={d.total}
            helper="Cadastros no período selecionado"
            icon={Users}
            tone="primary"
          />
          <MetricCard
            label="Pendentes de aprovação"
            value={d.pendingApproval}
            helper="Documentos ou análise em andamento"
            icon={Clock3}
            tone="warning"
          />
          <MetricCard
            label="Recorrência mensal estimada"
            value={brl(d.monthlyRecurringEstimate)}
            helper="4% das faturas dos clientes ativos"
            icon={TrendingUp}
            tone="success"
          />
          <MetricCard
            label="Comissão por meta"
            value={brl(d.currentGoal)}
            helper={d.activeCount + " cliente(s) ativo(s)"}
            icon={DollarSign}
            tone="info"
          />
        </div>
      </div>

      <div className="mb-5 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold">Filtros do painel</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use os filtros para analisar uma equipe, origem ou período específico.
            </p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Valores financeiros visíveis apenas para o ADM</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" />
          <Select value={st} onValueChange={setSt}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={or} onValueChange={setOr}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="anuncio">Anúncio</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <Select value={emp} onValueChange={setEmp}>
            <SelectTrigger>
              <SelectValue placeholder="Funcionário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os funcionários</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Target size={20} />
            </div>
            <div>
              <p className="text-sm font-extrabold">Metas de comissão</p>
              <p className="mt-1 text-xs text-muted-foreground">
                O cálculo considera clientes ativos. A recorrência de 4% é controlada separadamente.
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-muted-foreground">Meta atual</p>
            <p className="text-xl font-extrabold text-primary">{brl(d.currentGoal)}</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-muted/50 p-3.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="font-bold">Progresso até a próxima meta</p>
            <span className="font-extrabold text-primary">{d.goalProgress}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: d.goalProgress + "%" }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {d.nextGoal
              ? d.nextGoal.people - d.activeCount + " pessoa(s) faltando para " + brl(d.nextGoal.amount) + "."
              : "Parabéns: todas as metas cadastradas foram atingidas."}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COMMISSION_GOALS.map((goal) => (
            <GoalCard
              key={goal.people}
              people={goal.people}
              amount={goal.amount}
              activePeople={d.activeCount}
            />
          ))}
        </div>
      </section>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Clientes ativos"
          value={d.activeCount}
          helper="Base que gera recorrência"
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label="Recorrência acumulada (4%)"
          value={brl(d.accumulatedRecurring)}
          helper="Soma dos registros mensais lançados"
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard
          label="Recorrência recebida"
          value={brl(d.receivedRecurring)}
          helper="Registros marcados como recebidos"
          icon={DollarSign}
          tone="info"
        />
        <MetricCard
          label="Documentos pendentes"
          value={d.documentsPending}
          helper="Faltantes, pendentes ou em análise"
          icon={FileWarning}
          tone="warning"
        />
      </div>

      <section className="mb-6 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold">Desempenho por funcionário</p>
            <p className="mt-1 text-xs text-muted-foreground">Acompanhe a meta individual e os cadastros atribuídos no período.</p>
          </div>
          <Select value={performanceMonth} onValueChange={setPerformanceMonth}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={currentMonth}>Este mês</SelectItem>
              <SelectItem value={previousMonth}>Mês anterior</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.employeePerformance.length ? d.employeePerformance.map((item) => (
            <div key={item.id} className="rounded-xl border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{item.name}</p>
                <span className="text-sm font-extrabold text-primary">{item.count}/{item.goal || "—"}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: (item.goal ? item.percentage : 0) + "%" }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{item.goal ? item.percentage + "% da meta" : "Meta não definida"}</span>
                <span>{item.goal ? Math.max(item.goal - item.count, 0) + " faltando" : item.count + " cadastro(s)"}</span>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">Nenhum cadastro ou meta encontrada neste período.</p>}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="Cadastros por mês">
          <BarChart data={d.byMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="cadastros" fill={P} radius={4} />
          </BarChart>
        </Box>
        <Box title="Clientes por status">
          <PieChart>
            <Pie data={d.byStatus} dataKey="value" nameKey="name" outerRadius={85}>
              {d.byStatus.map((s) => (
                <Cell key={s.key} fill={statusColor(s.key)} />
              ))}
            </Pie>
            <Tooltip formatter={(v, n) => [v, statusLabel(String(n) as never) ?? n]} />
          </PieChart>
        </Box>
        <Box title="Clientes por origem">
          <PieChart>
            <Pie data={d.byOrigin} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85}>
              <Cell fill={P} />
              <Cell fill={G} />
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </Box>
        <Box title="Receita mensal (bruta)">
          <LineChart data={d.revMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip formatter={(v) => brl(Number(v))} />
            <Legend />
            <Line dataKey="estimada" stroke={P} strokeWidth={2} />
            <Line dataKey="realizada" stroke={G} strokeWidth={2} />
          </LineChart>
        </Box>
        <Box title="Cadastros por funcionário">
          <BarChart data={d.byEmp} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} fontSize={11} />
            <YAxis type="category" dataKey="name" width={90} fontSize={11} />
            <Tooltip />
            <Bar dataKey="cadastros" fill={P} radius={4} />
          </BarChart>
        </Box>
        <Box title="Ativos e inativos">
          <PieChart>
            <Pie data={d.ativosInativos} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85}>
              <Cell fill={G} />
              <Cell fill={M} />
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </Box>
      </div>
    </div>
  );
}
