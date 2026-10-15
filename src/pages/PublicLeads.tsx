import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, FileText, Filter, Mail, MapPin, MessageCircle, Phone, RotateCcw, Trash2, UserRoundSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type PublicLead = { id: string; full_name: string; whatsapp: string; city: string; email?: string | null; status: string; created_at: string; deleted_at?: string | null; referral_type?: "proprio" | "consultor" | null; consultant_name?: string | null; };
type PublicEvent = { lead_id: string; event_type: "self_registration" | "consultant_whatsapp"; };
type PublicDocument = { id: string; lead_id: string; doc_type: "energy_bill" | "identity"; file_name: string; file_path: string; };

function DocumentLinks({ documents }: { documents: PublicDocument[] }) {
  const [opening, setOpening] = useState<string | null>(null);
  async function openDocument(document: PublicDocument) {
    setOpening(document.id);
    const { data, error } = await supabase.storage.from("client-docs").createSignedUrl(document.file_path, 600);
    setOpening(null);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  return <div className="mt-2 flex flex-wrap gap-2">{documents.map((document) => <Button key={document.id} variant="outline" size="sm" disabled={opening === document.id} onClick={() => openDocument(document)}><FileText className="mr-1.5 h-4 w-4" />{document.doc_type === "energy_bill" ? "Conta de energia" : "Documento"}</Button>)}</div>;
}

const statusLabel: Record<string, string> = { capturado: "Novo", em_atendimento: "Em atendimento", convertido: "Concluído", descartado: "Descartado" };

function whatsappLink(phone: string, name: string) {
  const message = `Olá, ${name}! Aqui é da Conta Amiga. Recebemos seu pedido de análise gratuita. Posso te orientar sobre os documentos?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function PublicLeads() {
  const [showArchived, setShowArchived] = useState(false);
  const [referralFilter, setReferralFilter] = useState("todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["public-registration-leads", showArchived],
    queryFn: async () => {
      let query = (supabase as any).from("public_registration_leads").select("*").order("created_at", { ascending: false }).limit(300);
      query = showArchived ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
      const [{ data: leads, error: leadsError }, { data: events, error: eventsError }, { data: documents, error: documentsError }] = await Promise.all([
        query,
        (supabase as any).from("public_registration_events").select("lead_id, event_type").limit(3000),
        (supabase as any).from("public_registration_documents").select("id, lead_id, doc_type, file_name, file_path").limit(500),
      ]);
      if (leadsError) throw leadsError;
      if (eventsError) throw eventsError;
      if (documentsError) throw documentsError;
      const eventRows = (events ?? []) as PublicEvent[];
      const documentRows = (documents ?? []) as PublicDocument[];
      const eventsByLead = eventRows.reduce<Record<string, PublicEvent[]>>((acc, event) => { (acc[event.lead_id] ??= []).push(event); return acc; }, {});
      const documentsByLead = documentRows.reduce<Record<string, PublicDocument[]>>((acc, document) => { (acc[document.lead_id] ??= []).push(document); return acc; }, {});
      return { leads: (leads ?? []) as PublicLead[], eventsByLead, documentsByLead };
    },
  });

  const allLeads = data?.leads ?? [];
  const leads = useMemo(() => allLeads.filter((lead) => referralFilter === "todos" || (lead.referral_type ?? "proprio") === referralFilter), [allLeads, referralFilter]);
  const consultantClicks = Object.values(data?.eventsByLead ?? {}).flat().filter((event) => event.event_type === "consultant_whatsapp").length;
  const allSelected = leads.length > 0 && leads.every((lead) => selected.includes(lead.id));

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : leads.map((lead) => lead.id));
  }

  async function archive(ids: string[]) {
    if (!ids.length || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).from("public_registration_leads").update({ deleted_at: new Date().toISOString() }).in("id", ids);
    setBusy(false);
    if (error) return toast.error("Não foi possível mover para a lixeira: " + error.message);
    setSelected([]);
    toast.success(ids.length > 1 ? "Captações movidas para a lixeira." : "Captação movida para a lixeira.");
    await refetch();
  }

  async function restore(ids: string[]) {
    if (!ids.length || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).from("public_registration_leads").update({ deleted_at: null }).in("id", ids);
    setBusy(false);
    if (error) return toast.error("Não foi possível restaurar: " + error.message);
    setSelected([]);
    toast.success("Captações restauradas.");
    await refetch();
  }

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Entrada do site</p><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Captações de cadastro</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe quem chegou pelo link, de onde veio e chame pelo WhatsApp.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{showArchived ? "Na lixeira" : "Pessoas captadas"}</p><p className="mt-1 text-3xl font-extrabold">{isLoading ? "…" : leads.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Clicaram para falar com a equipe</p><p className="mt-1 text-3xl font-extrabold text-primary">{isLoading ? "…" : consultantClicks}</p></CardContent></Card>
        <Card><CardContent className="flex h-full items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">Selecionados</p><p className="mt-1 text-2xl font-extrabold">{selected.length}</p></div><Button variant="outline" size="sm" onClick={() => setShowArchived((value) => !value)}><Trash2 className="mr-1.5 h-4 w-4" />{showArchived ? "Voltar às captações" : "Ver lixeira"}</Button></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="flex items-center gap-2 text-lg"><UserRoundSearch className="h-5 w-5 text-primary" />{showArchived ? "Captações arquivadas" : "Últimas captações"}<Badge variant="secondary">{leads.length}</Badge></CardTitle><div className="flex flex-wrap gap-2"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><select value={referralFilter} onChange={(event) => setReferralFilter(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="todos">Todas as origens</option><option value="proprio">Conta própria</option><option value="consultor">Por consultor</option></select></div>{leads.length > 0 && <Button variant="outline" size="sm" onClick={toggleAll}><CheckSquare className="mr-1.5 h-4 w-4" />{allSelected ? "Desmarcar todos" : "Selecionar todos"}</Button>}{selected.length > 0 && (showArchived ? <Button size="sm" variant="outline" onClick={() => restore(selected)} disabled={busy}><RotateCcw className="mr-1.5 h-4 w-4" />Restaurar selecionados</Button> : <Button size="sm" variant="destructive" onClick={() => archive(selected)} disabled={busy}><Trash2 className="mr-1.5 h-4 w-4" />Mover selecionados</Button>)}</div></CardHeader>
        <CardContent>
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando captações...</p> : leads.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{showArchived ? "A lixeira está vazia." : "Ainda não há captações do site."}</p> : (
            <div className="space-y-3">{leads.map((lead) => {
              const leadEvents = data?.eventsByLead[lead.id] ?? [];
              const choseConsultant = (lead.referral_type ?? "proprio") === "consultor";
              return (
                <div key={lead.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelected(lead.id)} className="mt-1 h-4 w-4 accent-emerald-600" aria-label={`Selecionar ${lead.full_name}`} />
                      <div className="min-w-0"><p className="font-bold">{lead.full_name}</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.whatsapp}</span>{lead.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>}{lead.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>}</div><div className="mt-2 flex flex-wrap gap-2"><Badge variant={choseConsultant ? "default" : "secondary"}>{choseConsultant ? `Consultor: ${lead.consultant_name || "não informado"}` : "Vim por conta própria"}</Badge>{leadEvents.some((event) => event.event_type === "consultant_whatsapp") && <Badge variant="secondary">Chamou no WhatsApp</Badge>}{!choseConsultant && <Badge variant={lead.status === "capturado" ? "default" : "secondary"}>{statusLabel[lead.status] ?? lead.status}</Badge>}</div>{(data?.documentsByLead[lead.id] ?? []).length > 0 && <DocumentLinks documents={data?.documentsByLead[lead.id] ?? []} />}<p className="mt-3 text-xs text-muted-foreground">Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">{showArchived ? <Button variant="outline" size="sm" disabled={busy} onClick={() => restore([lead.id])}><RotateCcw className="mr-1.5 h-4 w-4" />Restaurar</Button> : <Button variant="destructive" size="sm" disabled={busy} onClick={() => archive([lead.id])}><Trash2 className="mr-1.5 h-4 w-4" />Lixeira</Button>}<Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"><a href={whatsappLink(lead.whatsapp, lead.full_name)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />Falar no WhatsApp</a></Button></div>
                  </div>
                </div>
              );
            })}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
