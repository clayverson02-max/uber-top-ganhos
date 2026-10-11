import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useCrmData";
import { normalizeWhatsapp, statusLabel, type ClientStatus } from "@/lib/crm";
import { uploadDoc, validatePdf } from "@/lib/docs";
import { PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  origin: z.enum(["anuncio", "whatsapp"], { errorMap: () => ({ message: "Selecione a origem" }) }),
  full_name: z.string().trim().min(3, "Nome completo obrigatório").max(150),
  email: z.string().trim().email("E-mail inválido").max(255),
  whatsapp: z.string().refine((v) => /^55\d{10,11}$/.test(normalizeWhatsapp(v)), "WhatsApp inválido (DDD + número)"),
  avg_bill: z.string().refine((v) => v === "" || (!isNaN(Number(v.replace(",", "."))) && Number(v.replace(",", ".")) >= 0), "Valor inválido"),
});

type Dup = { id: string; code: number; full_name: string; status: ClientStatus; match: string };

export default function NewClient() {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ origin: "", full_name: "", email: "", whatsapp: "", avg_bill: "", notes: "", last_contact_at: "", next_contact_at: "", responsible_id: user?.id ?? "" });
  const [fatura, setFatura] = useState<File | null>(null);
  const [docFoto, setDocFoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dups, setDups] = useState<Dup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent, force = false) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    const errs: Record<string, string> = {};
    if (!r.success) r.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message));
    const e1 = validatePdf(fatura); if (e1) errs.fatura = e1;
    const e2 = validatePdf(docFoto); if (e2) errs.docFoto = e2;
    setErrors(errs);
    if (Object.keys(errs).length || !user) return;
    const wa = normalizeWhatsapp(f.whatsapp);
    setBusy(true);
    if (!force) {
      const { data } = await supabase.rpc("find_duplicates", { _whatsapp: wa, _email: f.email.trim() });
      if (data && data.length) { setDups(data as Dup[]); setBusy(false); return; }
    }
    const { data: c, error } = await supabase.from("clients").insert({
      origin: f.origin, full_name: f.full_name.trim(), email: f.email.trim().toLowerCase(), whatsapp: wa,
      avg_bill: f.avg_bill ? Number(f.avg_bill.replace(",", ".")) : null, notes: f.notes.trim() || null,
      last_contact_at: f.last_contact_at || null, next_contact_at: f.next_contact_at || null,
      responsible_id: f.responsible_id || user.id, created_by: user.id,
      status: force ? "cadastro_duplicado" : "novo",
    }).select().single();
    if (error || !c) { setBusy(false); return toast.error("Erro ao salvar: " + error?.message); }
    try {
      await uploadDoc(c.id, "fatura", fatura!, user.id);
      await uploadDoc(c.id, "documento_foto", docFoto!, user.id);
    } catch (err) { toast.error("Cadastro salvo, mas houve erro no envio dos documentos. Reenvie no perfil."); }
    qc.invalidateQueries();
    setBusy(false);
    toast.success("Cadastro criado com sucesso");
    nav(`/clientes/${c.id}`);
  };

  const Err = ({ k }: { k: string }) => errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo cadastro" subtitle="Campos com * são obrigatórios" />
      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Origem *</Label>
            <Select value={f.origin} onValueChange={(v) => set("origin", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent><SelectItem value="anuncio">Anúncio</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
            </Select><Err k="origin" /></div>
          <div className="space-y-1.5"><Label>Nome completo *</Label><Input value={f.full_name} maxLength={150} onChange={(e) => set("full_name", e.target.value)} /><Err k="full_name" /></div>
          <div className="space-y-1.5"><Label>E-mail *</Label><Input type="email" value={f.email} maxLength={255} onChange={(e) => set("email", e.target.value)} /><Err k="email" /></div>
          <div className="space-y-1.5"><Label>WhatsApp *</Label><Input inputMode="tel" placeholder="(11) 91234-5678" value={f.whatsapp} maxLength={20} onChange={(e) => set("whatsapp", e.target.value)} /><Err k="whatsapp" /></div>
          <div className="space-y-1.5"><Label>Fatura de energia (PDF) *</Label><Input type="file" accept="application/pdf" onChange={(e) => setFatura(e.target.files?.[0] ?? null)} /><Err k="fatura" /></div>
          <div className="space-y-1.5"><Label>Documento com foto (PDF) *</Label><Input type="file" accept="application/pdf" onChange={(e) => setDocFoto(e.target.files?.[0] ?? null)} /><Err k="docFoto" /></div>
          <div className="space-y-1.5"><Label>Valor médio mensal da fatura (R$)</Label><Input inputMode="decimal" placeholder="Ex.: 500,00" value={f.avg_bill} onChange={(e) => set("avg_bill", e.target.value)} /><Err k="avg_bill" /></div>
          <div className="space-y-1.5"><Label>Funcionário responsável</Label>
            <Select value={f.responsible_id} onValueChange={(v) => set("responsible_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{profiles?.filter((p) => p.active).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>Data do último contato</Label><Input type="date" value={f.last_contact_at} onChange={(e) => set("last_contact_at", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Próximo contato previsto</Label><Input type="date" value={f.next_contact_at} onChange={(e) => set("next_contact_at", e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Observações</Label><Textarea maxLength={2000} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></div>

        {dups && (
          <div className="rounded-lg border border-warning/50 bg-accent/10 p-4 text-sm">
            <p className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />Já existe registro semelhante:</p>
            <ul className="mb-3 list-disc pl-5">{dups.map((d) => <li key={d.id}>#{d.code} {d.full_name} — {statusLabel(d.status)} (mesmo {d.match})</li>)}</ul>
            <p className="mb-3 text-muted-foreground">Se salvar mesmo assim, o registro será marcado como “Cadastro duplicado” e não gera bonificação.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDups(null)}>Revisar</Button>
              <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={(e) => submit(e as unknown as React.FormEvent, true)}>Salvar como duplicado</Button>
            </div>
          </div>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar cadastro</Button>
      </form>
    </div>
  );
}
