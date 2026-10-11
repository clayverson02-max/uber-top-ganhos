import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useClients, useDocs, useProfiles } from "@/hooks/useCrmData";
import { STATUSES, ORIGINS, brl, calcRevenue, fmtDate, fmtWhatsapp, statusColor, pendencies } from "@/lib/crm";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Empty, Loading, PageHeader } from "@/components/crm/States";
import { WhatsappActions } from "@/components/crm/WhatsappActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PER = 20;

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const { data: docs = [] } = useDocs();
  const { data: profiles = [] } = useProfiles();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [or, setOr] = useState("all");
  const [emp, setEmp] = useState("all");
  const [dc, setDc] = useState("all");
  const [sort, setSort] = useState("desc");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [page, setPage] = useState(1);
  const pname = (id: string | null) => profiles.find((p) => p.id === id)?.full_name || "—";

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const digits = s.replace(/\D/g, "");
    return (clients ?? []).filter((c) => {
      if (s && !(c.full_name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s) || (digits && c.whatsapp.includes(digits)))) return false;
      if (st !== "all" && c.status !== st) return false;
      if (or !== "all" && c.origin !== or) return false;
      if (emp !== "all" && c.responsible_id !== emp && c.created_by !== emp) return false;
      if (dc !== "all") {
        const pend = pendencies(c, docs).some((p) => p.includes("Fatura") || p.includes("Documento"));
        if (dc === "pendente" && !pend) return false;
        if (dc === "ok" && pend) return false;
      }
      return true;
    }).sort((a, b) => (sort === "desc" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)));
  }, [clients, docs, q, st, or, emp, dc, sort]);

  const pages = Math.max(1, Math.ceil(list.length / PER));
  const shown = list.slice((page - 1) * PER, page * PER);
  const docSummary = (id: string) => {
    const cur = docs.filter((d) => d.client_id === id && d.is_current);
    return `${cur.length}/2`;
  };

  return (
    <div>
      <PageHeader title="Clientes e potenciais clientes" subtitle={`${list.length} registro(s)`}
        actions={<>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}><List className="h-4 w-4" />Tabela</Button>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}><LayoutGrid className="h-4 w-4" />Kanban</Button>
          <Button size="sm" variant="secondary" asChild><Link to="/novo"><Plus className="h-4 w-4" />Novo</Link></Button>
        </>} />
      <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Input className="sm:col-span-3 lg:col-span-2" placeholder="Buscar por nome, e-mail ou WhatsApp" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select value={st} onValueChange={(v) => { setSt(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os status</SelectItem>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
        <Select value={or} onValueChange={(v) => { setOr(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas as origens</SelectItem><SelectItem value="anuncio">Anúncio</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select>
        <Select value={emp} onValueChange={(v) => { setEmp(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos os funcionários</SelectItem>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent></Select>
        <div className="flex gap-2">
          <Select value={dc} onValueChange={(v) => { setDc(v); setPage(1); }}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Documentos</SelectItem><SelectItem value="pendente">Com pendência</SelectItem><SelectItem value="ok">Completos</SelectItem></SelectContent></Select>
          <Select value={sort} onValueChange={setSort}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="desc">Mais recentes</SelectItem><SelectItem value="asc">Mais antigos</SelectItem></SelectContent></Select>
        </div>
      </div>

      {isLoading ? <Loading /> : !list.length ? <Empty title="Nenhum registro encontrado">Cadastre um novo potencial cliente para começar.</Empty> :
        view === "kanban" ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STATUSES.map((s) => {
              const items = list.filter((c) => c.status === s.value);
              return (
                <div key={s.value} className="w-72 shrink-0 rounded-xl bg-muted/60 p-2">
                  <div className="mb-2 flex items-center justify-between rounded-lg px-2 py-1.5 text-sm font-bold" style={{ borderLeft: `4px solid ${statusColor(s.value)}` }}>
                    {s.label}<span className="text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((c) => (
                      <button key={c.id} onClick={() => nav(`/clientes/${c.id}`)} className="w-full rounded-lg border bg-card p-3 text-left text-sm shadow-sm hover:border-primary">
                        <p className="font-semibold">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">{fmtWhatsapp(c.whatsapp)} · {ORIGINS[c.origin as keyof typeof ORIGINS]}</p>
                        <p className="mt-1 text-xs">Fatura: {brl(c.avg_bill)} · Docs {docSummary(c.id)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {shown.map((c) => (
                <div key={c.id} onClick={() => nav(`/clientes/${c.id}`)} className="rounded-xl border bg-card p-4">
                  <div className="mb-1 flex items-start justify-between gap-2"><p className="font-semibold">{c.full_name}</p><StatusBadge status={c.status} /></div>
                  <p className="text-sm text-muted-foreground">{fmtWhatsapp(c.whatsapp)} · {c.email}</p>
                  <p className="mt-1 text-xs">{ORIGINS[c.origin as keyof typeof ORIGINS]} · {pname(c.responsible_id)} · Fatura {brl(c.avg_bill)} · 4% {brl(calcRevenue(c.avg_bill))}</p>
                  <div className="mt-3"><WhatsappActions whatsapp={c.whatsapp} /></div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                  <tr>{["Nome", "WhatsApp", "E-mail", "Origem", "Status", "Responsável", "Fatura média", "Receita 4%", "Docs", "Cadastro", "Atualização"].map((h) => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id} onClick={() => nav(`/clientes/${c.id}`)} className="cursor-pointer border-t hover:bg-muted/40">
                      <td className="px-3 py-2.5 font-semibold">{c.full_name}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{fmtWhatsapp(c.whatsapp)}</td>
                      <td className="px-3 py-2.5">{c.email}</td>
                      <td className="px-3 py-2.5">{ORIGINS[c.origin as keyof typeof ORIGINS]}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-2.5">{pname(c.responsible_id)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{brl(c.avg_bill)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-success">{brl(calcRevenue(c.avg_bill))}</td>
                      <td className="px-3 py-2.5">{docSummary(c.id)}</td>
                      <td className="px-3 py-2.5">{fmtDate(c.created_at)}</td>
                      <td className="px-3 py-2.5">{fmtDate(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                Página {page} de {pages}
                <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            )}
          </>
        )}
    </div>
  );
}
