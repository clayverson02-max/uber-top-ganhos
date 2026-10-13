import { useQuery } from "@tanstack/react-query";
import { MapPin, MessageCircle, Phone, UserRoundSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PublicLead = {
  id: string;
  full_name: string;
  whatsapp: string;
  city: string;
  status: string;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  capturado: "Novo",
  em_atendimento: "Em atendimento",
  convertido: "Concluído",
  descartado: "Descartado",
};

function whatsappLink(phone: string, name: string) {
  const message = `Olá, ${name}! Aqui é da Conta Amiga. Vi que você iniciou seu cadastro. Posso ajudar a concluir?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function PublicLeads() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["public-registration-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_registration_leads")
        .select("id, full_name, whatsapp, city, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PublicLead[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Entrada do site</p>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Captações de cadastro</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pessoas que informaram nome, WhatsApp e cidade para escolher como continuar.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg"><UserRoundSearch className="h-5 w-5 text-primary" />Últimas captações</CardTitle>
          <Badge variant="secondary">{leads.length}</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Carregando captações...</p>
          ) : leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Ainda não há captações do site.</p>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">{lead.full_name}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{lead.whatsapp}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{lead.city}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={lead.status === "capturado" ? "default" : "secondary"}>{statusLabel[lead.status] ?? lead.status}</Badge>
                      <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                        <a href={whatsappLink(lead.whatsapp, lead.full_name)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp</a>
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Recebido em {new Date(lead.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
