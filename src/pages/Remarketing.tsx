import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useDocs, useProfiles } from "@/hooks/useCrmData";
import { ORIGINS, daysSince, fmtDate, fmtWhatsapp, pendencies, type Client, type ClientDoc } from "@/lib/crm";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { Empty, Loading, PageHeader } from "@/components/crm/States";
import { WhatsappActions } from "@/components/crm/WhatsappActions";
import { cn } from "@/lib/utils";

const cur = (c: Client, docs: ClientDoc[]) => docs.filter((d) => d.client_id === c.id && d.is_current);
const FILTERS: { key: string; label: string; fn: (c: Client, d: ClientDoc[]) => boolean }[] = [
  { key: "anuncio", label: "Vieram de anúncio", fn: (c) => c.origin === "anuncio" },
  { key: "whatsapp", label: "Vieram pelo WhatsApp", fn: (c) => c.origin === "whatsapp" },
  { key: "semdocs", label: "Não enviaram documentos", fn: (c, d) => cur(c, d).length < 2 },
  { key: "docsnaoconcluiu", label: "Enviaram docs mas não concluíram", fn: (c, d) => cur(c, d).length >= 2 && ["novo", "primeiro_contato", "aguardando_documentos", "documentos_recebidos", "documentos_em_analise"].includes(c.status) },
  { key: "parou", label: "Pararam de responder", fn: (c) => c.stopped_responding },
  { key: "3d", label: "Sem contato há +3 dias", fn: (c) => (daysSince(c.last_contact_at ?? c.created_at) ?? 0) > 3 },
  { key: "7d", label: "Sem contato há +7 dias", fn: (c) => (daysSince(c.last_contact_at ?? c.created_at) ?? 0) > 7 },
  { key: "rejeitado", label: "Documentos rejeitados", fn: (c, d) => cur(c, d).some((x) => x.status === "rejeitado") },
  { key: "nao", label: "Não prosseguiu", fn: (c) => c.status === "nao_prosseguiu" },
  { key: "inativo", label: "Clientes inativos", fn: (c) => c.status === "cliente_inativo" },
];

export default function Remarketing() {
  const { data: clients, isLoading } = useClients();
  const { data: docs = [] } = useDocs();
  const { data: profiles = [] } = useProfiles();
  const nav = useNavigate();
  const [active, setActive] = useState<string[]>(["parou"]);
  const toggle = (k: string) => setActive((a) => (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]));

  const list = useMemo(() => (clients ?? []).filter((c) => c.status !== "cadastro_duplicado" && FILTERS.filter((f) => active.includes(f.key)).every((f) => f.fn(c, docs))), [clients, docs, active]);

  return (
    <div>
      <PageHeader title="Remarketing" subtitle="Contato manual — copie o número ou abra a conversa. Nenhuma mensagem é enviada automaticamente." />
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => toggle(f.key)} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", active.includes(f.key) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}>{f.label}</button>
        ))}
      </div>
      {isLoading ? <Loading /> : !list.length ? <Empty title="Ninguém nesse filtro" /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const p = pendencies(c, docs);
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <button onClick={() => nav(`/clientes/${c.id}`)} className="text-left font-semibold hover:text-primary">{c.full_name}</button>
                  <StatusBadge status={c.status} />
                </div>
                <dl className="grid grid-cols-2 gap-1 text-xs">
                  <dt className="text-muted-foreground">WhatsApp</dt><dd>{fmtWhatsapp(c.whatsapp)}</dd>
                  <dt className="text-muted-foreground">Origem</dt><dd>{ORIGINS[c.origin as keyof typeof ORIGINS]}</dd>
                  <dt className="text-muted-foreground">Último contato</dt><dd>{fmtDate(c.last_contact_at)}</dd>
                  <dt className="text-muted-foreground">Funcionário</dt><dd>{profiles.find((x) => x.id === c.responsible_id)?.full_name || "—"}</dd>
                </dl>
                <p className="mt-2 text-xs"><span className="font-semibold">Pendência: </span>{p.length ? p.join(" · ") : "Nenhuma"}</p>
                <div className="mt-3"><WhatsappActions whatsapp={c.whatsapp} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
