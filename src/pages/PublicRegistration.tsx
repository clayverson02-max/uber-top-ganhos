import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, MapPin, MessageCircle, Phone, UserRound, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { normalizeWhatsapp } from "@/lib/crm";

const IGREEN_SELF_LINK = "https://green.igreenenergy.com.br/autoconexao/?id=175762&desc=10";

type FormState = {
  full_name: string;
  whatsapp: string;
  city: string;
};

const initialForm: FormState = { full_name: "", whatsapp: "", city: "" };

export default function PublicRegistration() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const consultantMessage = useMemo(
    () =>
      [
        "Olá! Quero fazer meu cadastro gratuito com ajuda de um consultor da Conta Amiga.",
        "",
        `Nome: ${form.full_name.trim()}`,
        `WhatsApp: ${form.whatsapp.trim()}`,
        `Cidade: ${form.city.trim()}`,
      ].join("\n"),
    [form],
  );

  const consultantLink = `https://wa.me/?text=${encodeURIComponent(consultantMessage)}`;

  const update = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const whatsapp = normalizeWhatsapp(form.whatsapp);

    if (form.full_name.trim().length < 3) {
      toast({ title: "Informe seu nome completo.", variant: "destructive" });
      return;
    }
    if (!/^55\d{10,11}$/.test(whatsapp)) {
      toast({ title: "Informe um WhatsApp válido com DDD.", description: "Exemplo: (85) 99999-9999", variant: "destructive" });
      return;
    }
    if (form.city.trim().length < 2) {
      toast({ title: "Informe sua cidade.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("public_registration_leads").insert({
      full_name: form.full_name.trim(),
      whatsapp,
      city: form.city.trim(),
      source: "public_cadastro",
      status: "capturado",
    });
    setLoading(false);

    if (error) {
      toast({ title: "Não foi possível concluir agora.", description: "Tente novamente em alguns instantes.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
    toast({ title: "Dados recebidos!", description: "Agora escolha como quer continuar." });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/60 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="rounded-3xl bg-brand p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
          <div className="mb-7 flex items-center gap-2 font-extrabold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Zap className="h-5 w-5" />
            </span>
            Conta Amiga
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Cadastro gratuito</p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Comece seu cadastro em menos de 1 minuto</h1>
          <p className="mt-4 text-sm leading-6 text-white/85 sm:text-base">
            Informe apenas seu nome, WhatsApp e cidade. Depois você escolhe se quer concluir sozinho ou receber ajuda de um consultor.
          </p>
        </header>

        {!submitted ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p><strong>É simples e gratuito:</strong> preencha os 3 dados abaixo para liberar as duas formas de cadastro.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="public-name" className="font-bold text-slate-800">Nome completo</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input id="public-name" value={form.full_name} onChange={update("full_name")} placeholder="Como podemos chamar você?" className="h-12 pl-10" autoComplete="name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-whatsapp" className="font-bold text-slate-800">Número de WhatsApp</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input id="public-whatsapp" value={form.whatsapp} onChange={update("whatsapp")} placeholder="(85) 99999-9999" className="h-12 pl-10" inputMode="tel" autoComplete="tel" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-city" className="font-bold text-slate-800">Cidade</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input id="public-city" value={form.city} onChange={update("city")} placeholder="Ex.: Caucaia - CE" className="h-12 pl-10" autoComplete="address-level2" />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="h-13 w-full rounded-xl bg-emerald-600 py-6 text-base font-extrabold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                {loading ? "Salvando seus dados..." : "Continuar cadastro gratuito"}
              </Button>
              <p className="text-center text-xs leading-5 text-slate-500">Seus dados serão usados somente para orientar seu cadastro e atendimento.</p>
            </form>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span>
                <div>
                  <p className="text-lg font-extrabold text-slate-900">Perfeito, {form.full_name.split(" ")[0]}!</p>
                  <p className="text-sm text-slate-600">Escolha como quer concluir seu cadastro.</p>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5">
                  <p className="text-lg font-extrabold text-slate-900">1. Se cadastre sozinho</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Acesse o site oficial da iGreen e conclua seu cadastro individual com segurança.</p>
                  <Button asChild className="mt-4 h-12 w-full rounded-xl bg-emerald-600 font-extrabold text-white hover:bg-emerald-700">
                    <a href={IGREEN_SELF_LINK} target="_blank" rel="noopener noreferrer">Abrir cadastro oficial <ExternalLink className="ml-2 h-4 w-4" /></a>
                  </Button>
                </div>
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
                  <p className="text-lg font-extrabold text-slate-900">2. Fale com um consultor</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Prefere ajuda? Abra o WhatsApp com seus dados já preenchidos e nossa equipe orienta você.</p>
                  <Button asChild variant="outline" className="mt-4 h-12 w-full rounded-xl border-emerald-600 font-extrabold text-emerald-700 hover:bg-emerald-50">
                    <a href={consultantLink} target="_blank" rel="noopener noreferrer">Falar com um consultor <MessageCircle className="ml-2 h-4 w-4" /></a>
                  </Button>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setSubmitted(false)} className="w-full py-2 text-sm font-semibold text-slate-500 underline underline-offset-4">Voltar e corrigir dados</button>
          </section>
        )}
      </div>
    </main>
  );
}
