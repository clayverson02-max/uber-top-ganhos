import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, MapPin, MessageCircle, Phone, UserRoundSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PublicLead = { id: string; full_name: string; whatsapp: string; city: string; status: string; created_at: string; };
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
  const message = `Olá, ${name}! Aqui é da Conta Amiga. Vi que você iniciou seu cadastro e posso ajudar a concluir. Posso orientar você?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function PublicLeads() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-registration-leads"],
    queryFn: async () => {
      const [{ data: leads, error: leadsError }, { data: events, error: eventsError }, { data: documents, error: documentsError }] = await Promise.all([
        supabase.from("public_registration_leads").select("id, full_name, whatsapp, city, status, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("public_registration_events").select("lead_id, event_type").limit(1000),
        supabase.from("public_registration_documents").select("id, lead_id, doc_type, file_name, file_path").limit(200),
      ]);
      if (leadsError) throw leadsError;
      if (eventsError) throw eventsError;
      if (documentsError) throw documentsError;
      const eventRows = (events ?? []) as PublicEvent[];
      const documentRows = (documents ?? []) as PublicDocument[];
      const siteClicks = new Set(eventRows.filter((event) => event.event_type === "self_registration").map((event) => event.lead_id)).size;
      const consultantClicks = new Set(eventRows.filter((event) => event.event_type === "consultant_whatsapp").map((event) => event.lead_id)).size;
      const eventsByLead = eventRows.reduce<Record<string, PublicEvent[]>>((acc, event) => { (acc[event.lead_id] ??= []).push(event); return acc; }, {});
      const documentsByLead = documentRows.reduce<Record<string, PublicDocument[]>>((acc, document) => { (acc[document.lead_id] ??= []).push(document); return acc; }, {});
      return { leads: (leads ?? []) as PublicLead[], siteClicks, consultantClicks, eventsByLead, documentsByLead };
    },
  });

  const leads = data?.leads ?? [];
  return (
    <div className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-primary">Entrada do site</p><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Captações de cadastro</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe quem chegou pelo link e qual caminho escolheu.</p></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pessoas captadas</p><p className="mt-1 text-3xl font-extrabold">{isLoading ? "…" : leads.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Foram para cadastro individual</p><p className="mt-1 text-3xl font-extrabold text-emerald-600">{isLoading ? "…" : data?.siteClicks ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Escolheram falar com consultor</p><p className="mt-1 text-3xl font-extrabold text-primary">{isLoading ? "…" : data?.consultantClicks ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle className="flex items-center gap-2 text-lg"><UserRoundSearch className="h-5 w-5 text-primary" />Últimas captações</CardTitle><Badge variant="secondary">{leads.length}</Badge></CardHeader>
        <CardContent>
          {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando captações...</p> : leads.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há captações do site.</p> : (
            <div className="space-y-3">{leads.map((lead) => { const leadEvents = data?.eventsByLead[lead.id] ?? []; const choseSite = leadEvents.some((event) => event.event_type === "self_registration"); const choseConsultant = leadEvents.some((event) => event.event_type === "consultant_whatsapp"); return (
              <div key={lead.id} className="rounded-2xl border bg-background p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{lead.full_name}</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.whatsapp}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lead.city}</span></div><div className="mt-2 flex flex-wrap gap-2">{choseSite && <Badge variant="secondary">Cadastro individual</Badge>}{choseConsultant && <Badge variant="secondary">Consultor</Badge>}{!choseSite && !choseConsultant && <Badge variant={lead.status === "capturado" ? "default" : "secondary"}>{statusLabel[lead.status] ?? lead.status}</Badge>} </div>{(data?.documentsByLead[lead.id] ?? []).length > 0 && <DocumentLinks documents={data?.documentsByLead[lead.id] ?? []} />}</div><Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700"><a href={whatsappLink(lead.whatsapp, lead.full_name)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />Falar no WhatsApp</a></Button></div><p className="mt-3 text-xs text-muted-foreground">Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")}</p></div>
            );})}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
