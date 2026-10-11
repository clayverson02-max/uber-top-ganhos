import type { Database } from "@/integrations/supabase/types";

export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type DocStatus = Database["public"]["Enums"]["doc_status"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientDoc = Database["public"]["Tables"]["client_documents"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Bonus = Database["public"]["Tables"]["bonuses"]["Row"];
export type MonthlyRevenue = Database["public"]["Tables"]["monthly_revenues"]["Row"];

/** Regras financeiras fixas (também aplicadas no banco). */
export const REVENUE_PERCENT = 0.04;
export const BONUS_AMOUNT = 25;

export const STATUSES: { value: ClientStatus; label: string }[] = [
  { value: "novo", label: "Novo potencial cliente" },
  { value: "primeiro_contato", label: "Primeiro contato realizado" },
  { value: "aguardando_documentos", label: "Aguardando documentos" },
  { value: "documentos_recebidos", label: "Documentos recebidos" },
  { value: "documentos_em_analise", label: "Documentos em análise" },
  { value: "cadastro_concluido", label: "Cadastro concluído" },
  { value: "cliente_ativo", label: "Cliente ativo" },
  { value: "cliente_inativo", label: "Cliente inativo" },
  { value: "nao_prosseguiu", label: "Não prosseguiu" },
  { value: "cadastro_duplicado", label: "Cadastro duplicado" },
];
export const statusLabel = (s: ClientStatus) => STATUSES.find((x) => x.value === s)?.label ?? s;
export const statusColor = (s: ClientStatus) => `hsl(var(--st-${s}))`;

export const DOC_STATUSES: { value: DocStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "recebido", label: "Recebido" },
  { value: "em_analise", label: "Em análise" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
];
export const docStatusLabel = (s: DocStatus) => DOC_STATUSES.find((x) => x.value === s)?.label ?? s;
export const DOC_TYPES = { fatura: "Fatura de energia", documento_foto: "Documento com foto" } as const;
export type DocType = keyof typeof DOC_TYPES;

export const ORIGINS = { anuncio: "Anúncio", whatsapp: "WhatsApp" } as const;

/** Clientes validados = já passaram por concluído / ativo / inativo. */
export const VALIDATED: ClientStatus[] = ["cadastro_concluido", "cliente_ativo", "cliente_inativo"];
export const isPotential = (s: ClientStatus) => !VALIDATED.includes(s) && s !== "cadastro_duplicado";

export const brl = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export const calcRevenue = (bill: number | null | undefined) =>
  bill == null ? null : Math.round(Number(bill) * REVENUE_PERCENT * 100) / 100;

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  const dt = d.length === 10 ? new Date(d + "T12:00:00") : new Date(d);
  return dt.toLocaleDateString("pt-BR");
};
export const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
export const fmtMonth = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export const onlyDigits = (s: string) => s.replace(/\D/g, "");
/** Normaliza para DDI 55 + DDD + número. */
export const normalizeWhatsapp = (s: string) => {
  const d = onlyDigits(s);
  if (d.length === 10 || d.length === 11) return "55" + d;
  return d;
};
export const fmtWhatsapp = (d: string) => {
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : d;
};
export const waLink = (d: string) => `https://wa.me/${d}`;

export const daysSince = (d: string | null | undefined) => {
  if (!d) return null;
  const dt = d.length === 10 ? new Date(d + "T12:00:00") : new Date(d);
  return Math.floor((Date.now() - dt.getTime()) / 86400000);
};

export function pendencies(c: Client, docs: ClientDoc[]): string[] {
  const p: string[] = [];
  const cur = docs.filter((d) => d.client_id === c.id && d.is_current);
  (Object.keys(DOC_TYPES) as DocType[]).forEach((t) => {
    const d = cur.find((x) => x.doc_type === t);
    if (!d) p.push(`${DOC_TYPES[t]} não enviada`);
    else if (d.status === "rejeitado") p.push(`${DOC_TYPES[t]} rejeitada`);
  });
  if (c.avg_bill == null) p.push("Valor médio da fatura não informado");
  if (c.stopped_responding) p.push("Parou de responder");
  return p;
}
