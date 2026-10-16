import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, UserX, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Loading, Empty } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Consultant = { id: string; name: string; active: boolean; created_at: string };
type Lead = { consultant_id: string | null; consultant_name: string | null; created_at: string; referral_type: string | null };

export default function Consultants() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data, isLoading } = useQuery({
    queryKey: ["consultants-page", month],
    queryFn: async () => {
      const start = new Date(`${month}-01T00:00:00`).toISOString();
      const endDate = new Date(`${month}-01T00:00:00`);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      const end = endDate.toISOString();
      const [{ data: consultants, error: consultantsError }, { data: leads, error: leadsError }] = await Promise.all([
        (supabase as any).from("consultants").select("id,name,active,created_at").order("name"),
        (supabase as any).from("public_registration_leads").select("consultant_id,consultant_name,created_at,referral_type").gte("created_at", start).lt("created_at", end).is("deleted_at", null),
      ]);
      if (consultantsError) throw consultantsError;
      if (leadsError) throw leadsError;
      return { consultants: (consultants ?? []) as Consultant[], leads: (leads ?? []) as Lead[] };
    },
  });

  const normalizeName = (value: string | null | undefined) =>
    (value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    const registered = data?.consultants ?? [];
    const consultantById = new Map(registered.map((consultant) => [consultant.id, consultant]));

    (data?.leads ?? []).forEach((lead) => {
      const matched = lead.consultant_id
        ? consultantById.get(lead.consultant_id)
        : registered.find((consultant) => normalizeName(consultant.name) === normalizeName(lead.consultant_name));

      if (matched) result[matched.id] = (result[matched.id] ?? 0) + 1;
    });

    return result;
  }, [data?.leads, data?.consultants]);

  async function addConsultant(event: React.FormEvent) {
    event.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) return toast.error("Informe o nome do consultor.");
    setBusy(true);
    const { error } = await (supabase as any).from("consultants").insert({ name: clean });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "Esse influencer já está cadastrado." : error.message);
    setName("");
    toast.success("Influencer cadastrado.");
    qc.invalidateQueries({ queryKey: ["consultants-page"] });
  }

  async function toggle(consultant: Consultant) {
    setBusy(true);
    const { error } = await (supabase as any).from("consultants").update({ active: !consultant.active, updated_at: new Date().toISOString() }).eq("id", consultant.id);
    setBusy(false);
    if (error) return toast.error("Não foi possível atualizar: " + error.message);
    toast.success(consultant.active ? "Influencer desativado." : "Influencer reativado.");
    qc.invalidateQueries({ queryKey: ["consultants-page"] });
  }

  if (isLoading) return <Loading />;
  const consultants = data?.consultants ?? [];

  return (
    <div>
      <PageHeader title="Consultores" subtitle="Cadastre os influencers e acompanhe os cadastros indicados para cada um." />
      <form onSubmit={addConsultant} className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5"><label className="text-sm font-semibold">Nome do influencer</label><Input value={name} maxLength={120} placeholder="Ex.: Edenilson" onChange={(event) => setName(event.target.value)} /></div>
        <Button type="submit" disabled={busy}><UserPlus className="mr-2 h-4 w-4" />Cadastrar influencer</Button>
      </form>

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold">Resumo de indicações</p><p className="text-sm text-muted-foreground">O total considera captações ativas no mês selecionado.</p></div>
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full sm:w-48" />
      </div>

      {!consultants.length ? <Empty title="Nenhum influencer cadastrado">Cadastre o primeiro influencer acima.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {consultants.map((consultant) => (
            <div key={consultant.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-lg font-extrabold">{consultant.name}</p><div className="mt-1 flex flex-wrap gap-2"><Badge variant={consultant.active ? "default" : "secondary"}>{consultant.active ? "Pode ser informado no cadastro público" : "Desativado"}</Badge></div></div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
              </div>
              <div className="mt-5 rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Cadastros indicados em {month.split("-").reverse().join("/")}</p><p className="mt-1 text-3xl font-extrabold">{counts[consultant.id] ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">Use essa contagem como base para a bonificação.</p></div>
              <Button variant="outline" size="sm" className="mt-4 w-full" disabled={busy} onClick={() => toggle(consultant)}>{consultant.active ? <><UserX className="mr-2 h-4 w-4" />Desativar no cadastro público</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Reativar no cadastro público</>}</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
