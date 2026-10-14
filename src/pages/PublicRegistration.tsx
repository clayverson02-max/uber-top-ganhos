import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { CheckCircle2, FileText, IdCard, Mail, MessageCircle, Phone, ShieldCheck, UserRound, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { normalizeWhatsapp } from "@/lib/crm";

type FormState = { full_name: string; email: string; whatsapp: string };
const initialForm: FormState = { full_name: "", email: "", whatsapp: "" };
const emailOk = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 255;

export default function PublicRegistration() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const message = useMemo(() => [
    "Olá! Quero fazer minha análise gratuita na Conta Amiga.",
    "",
    `Nome: ${form.full_name.trim()}`,
    `E-mail: ${form.email.trim()}`,
    `WhatsApp: ${form.whatsapp.trim()}`,
    "",
    "Vou enviar aqui no atendimento:",
    "• Fatura de energia em PDF, de preferência sem senha;",
    "• Documento com foto em PDF (RG ou CNH Digital);",
    "• Se não conseguir PDF, envio uma foto legível pelo WhatsApp.",
    "",
    "Sei que o nome do titular precisa ser igual ao nome da conta de energia.",
  ].join("\n"), [form]);

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const update = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const whatsapp = normalizeWhatsapp(form.whatsapp);
    const email = form.email.trim().toLowerCase();
    if (form.full_name.trim().length < 3) return toast({ title: "Informe seu nome completo.", variant: "destructive" });
    if (!emailOk(email)) return toast({ title: "Informe um e-mail válido.", variant: "destructive" });
    if (!/^55\d{10,11}$/.test(whatsapp)) return toast({ title: "Informe um WhatsApp válido com DDD.", description: "Exemplo: (85) 99999-9999", variant: "destructive" });

    const id = crypto.randomUUID();
    const base = { id, full_name: form.full_name.trim(), whatsapp, city: "", source: "public_cadastro", status: "capturado" };
    setLoading(true);
    let { error } = await supabase.from("public_registration_leads").insert({ ...base, email });
    // Compatibilidade: se o banco ainda não tiver a coluna de e-mail, salva o restante (o e-mail segue na mensagem).
    if (error && /email/i.test(error.message)) ({ error } = await supabase.from("public_registration_leads").insert(base));
    setLoading(false);
    if (error) return toast({ title: "Não foi possível concluir agora.", description: "Tente novamente em alguns instantes.", variant: "destructive" });
    setLeadId(id);
  }

  function openWhatsapp() {
    if (leadId) void supabase.from("public_registration_events" as never).insert({ lead_id: leadId, event_type: "consultant_whatsapp" } as never);
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/60 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="rounded-3xl bg-brand p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
          <div className="mb-6 flex items-center gap-2 font-extrabold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Zap className="h-5 w-5" /></span>
            Conta Amiga
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Análise gratuita</p>
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Faça sua análise gratuita para descobrir se pode receber o benefício de economia na conta de energia.</h1>
          <ul className="mt-5 space-y-2 text-sm leading-6 text-white/90 sm:text-base">
            <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />O cadastro é <strong>gratuito</strong>.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />Nossa equipe faz todo o atendimento com você pelo WhatsApp.</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />Primeiro fazemos uma análise, conforme as regras do programa.</li>
          </ul>
        </header>

        {!leadId ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="public-name" className="font-bold text-slate-800">Nome completo</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><Input id="public-name" value={form.full_name} maxLength={150} onChange={update("full_name")} placeholder="Seu nome completo" className="h-12 pl-10" autoComplete="name" /></div></div>
              <div className="space-y-2"><Label htmlFor="public-email" className="font-bold text-slate-800">E-mail</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><Input id="public-email" type="email" value={form.email} maxLength={255} onChange={update("email")} placeholder="seuemail@exemplo.com" className="h-12 pl-10" autoComplete="email" inputMode="email" /></div></div>
              <div className="space-y-2"><Label htmlFor="public-whatsapp" className="font-bold text-slate-800">WhatsApp</Label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><Input id="public-whatsapp" value={form.whatsapp} maxLength={20} onChange={update("whatsapp")} placeholder="(85) 99999-9999" className="h-12 pl-10" inputMode="tel" autoComplete="tel" /></div></div>
              <Button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 py-6 text-base font-extrabold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">{loading ? "Salvando seus dados..." : "Continuar"}</Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-slate-500"><ShieldCheck className="h-4 w-4" />Seus dados são usados somente para o seu atendimento.</p>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span><div><p className="text-lg font-extrabold">Pronto, {form.full_name.trim().split(" ")[0]}!</p><p className="text-sm text-slate-600">Agora fale com a nossa equipe para continuar.</p></div></div>
            <p className="mb-3 text-sm font-bold text-slate-800">No atendimento, tenha em mãos:</p>
            <ul className="mb-5 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />Fatura de energia em PDF, de preferência sem senha.</li>
              <li className="flex gap-3"><IdCard className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />Documento com foto em PDF, como RG ou CNH Digital.</li>
              <li className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />Se não conseguir PDF, pode tirar uma foto legível e enviar pelo WhatsApp.</li>
              <li className="flex gap-3"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />O nome do titular precisa ser igual ao nome que aparece na conta de energia.</li>
            </ul>
            <Button onClick={openWhatsapp} className="w-full rounded-xl bg-emerald-600 py-6 text-base font-extrabold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"><MessageCircle className="mr-2 h-5 w-5" />Falar com a equipe pelo WhatsApp</Button>
            <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-900">Se precisar de ajuda, nossa equipe orienta você em todo o processo.</p>
          </section>
        )}
      </div>
    </main>
  );
}
