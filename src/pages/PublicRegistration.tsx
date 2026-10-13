import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, FileCheck2, Info, MapPin, MessageCircle, Phone, Upload, UserRound, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { normalizeWhatsapp } from "@/lib/crm";

const IGREEN_SELF_LINK = "https://green.igreenenergy.com.br/autoconexao/?id=175762&desc=10";

type FormState = { full_name: string; whatsapp: string; city: string };
const initialForm: FormState = { full_name: "", whatsapp: "", city: "" };

export default function PublicRegistration() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showSelfRegistrationInfo, setShowSelfRegistrationInfo] = useState(false);
  const [energyBill, setEnergyBill] = useState<File | null>(null);
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsSent, setDocumentsSent] = useState(false);

  const consultantMessage = useMemo(() => [
    "Olá! Quero fazer meu cadastro gratuito com ajuda de um consultor da Conta Amiga.",
    "",
    `Nome: ${form.full_name.trim()}`,
    `WhatsApp: ${form.whatsapp.trim()}`,
    `Cidade: ${form.city.trim()}`,
  ].join("\n"), [form]);

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

    const newLeadId = crypto.randomUUID();
    setLoading(true);
    const { error } = await supabase.from("public_registration_leads").insert({
      id: newLeadId,
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

    setLeadId(newLeadId);
    setSubmitted(true);
    toast({ title: "Dados recebidos!", description: "Agora escolha como quer continuar." });
  }

  function trackEvent(eventType: "self_registration" | "consultant_whatsapp") {
    if (leadId) void supabase.from("public_registration_events").insert({ lead_id: leadId, event_type: eventType });
  }

  function trackAndOpen(eventType: "self_registration" | "consultant_whatsapp", url: string) {
    trackEvent(eventType);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDocumentUpload() {
    if (!leadId || !energyBill || !identityDocument) {
      toast({ title: "Selecione os dois documentos.", description: "Precisamos da conta de energia e de um documento com foto.", variant: "destructive" });
      return;
    }
    const allowed = (file: File) => file.type === "application/pdf" || file.type === "image/jpeg" || file.type === "image/png";
    if (![energyBill, identityDocument].every(allowed)) {
      toast({ title: "Formato não aceito.", description: "Envie PDF, JPG ou PNG.", variant: "destructive" });
      return;
    }
    if ([energyBill, identityDocument].some((file) => file.size > 10 * 1024 * 1024)) {
      toast({ title: "Arquivo muito grande.", description: "Cada arquivo deve ter no máximo 10 MB.", variant: "destructive" });
      return;
    }
    setDocumentsLoading(true);
    const uploads = [
      { file: energyBill, docType: "energy_bill" as const },
      { file: identityDocument, docType: "identity" as const },
    ];
    for (const item of uploads) {
      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = "public-leads/" + leadId + "/" + item.docType + "-" + crypto.randomUUID() + "-" + safeName;
      const { error: uploadError } = await supabase.storage.from("client-docs").upload(path, item.file, { contentType: item.file.type, upsert: false });
      if (uploadError) {
        setDocumentsLoading(false);
        toast({ title: "Não foi possível enviar os documentos.", description: "Confira os arquivos e tente novamente.", variant: "destructive" });
        return;
      }
      const { error: metadataError } = await supabase.from("public_registration_documents").insert({
        lead_id: leadId, doc_type: item.docType, file_name: item.file.name, file_path: path, content_type: item.file.type,
      });
      if (metadataError) {
        await supabase.storage.from("client-docs").remove([path]);
        setDocumentsLoading(false);
        toast({ title: "Não foi possível registrar os documentos.", description: "Tente novamente em alguns instantes.", variant: "destructive" });
        return;
      }
    }
    setDocumentsLoading(false);
    setDocumentsSent(true);
    toast({ title: "Documentos enviados!", description: "Nossa equipe fará a análise do cadastro." });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/60 px-4 py-6 text-slate-900 sm:py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="rounded-3xl bg-brand p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8">
          <div className="mb-7 flex items-center gap-2 font-extrabold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Zap className="h-5 w-5" /></span>
            Conta Amiga
          </div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Cadastro gratuito</p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">Comece seu cadastro em menos de 1 minuto</h1>
          <p className="mt-4 text-sm leading-6 text-white/85 sm:text-base">Informe apenas seu nome, WhatsApp e cidade. Depois você escolhe se quer concluir sozinho ou receber ajuda de um consultor.</p>
        </header>

        {!submitted ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
            <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <p><strong>É simples e gratuito:</strong> preencha os 3 dados abaixo para liberar as duas formas de cadastro.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="public-name" className="font-bold text-slate-800">Nome completo</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><Input id="public-name" value={form.full_name} onChange={update("full_name")} placeholder="Como podemos chamar você?" className="h-12 pl-10" autoComplete="name" /></div></div>
              <div className="space-y-2"><Label htmlFor="public-whatsapp" className="font-bold text-slate-800">Número de WhatsApp</Label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><Input id="public-whatsapp" value={form.whatsapp} onChange={update("whatsapp")} placeholder="(85) 99999-9999" className="h-12 pl-10" inputMode="tel" autoComplete="tel" /></div></div>
              <div className="space-y-2"><Label htmlFor="public-city" className="font-bold text-slate-800">Cidade</Label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><Input id="public-city" value={form.city} onChange={update("city")} placeholder="Ex.: Caucaia - CE" className="h-12 pl-10" autoComplete="address-level2" /></div></div>
              <Button type="submit" disabled={loading} className="h-13 w-full rounded-xl bg-emerald-600 py-6 text-base font-extrabold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">{loading ? "Salvando seus dados..." : "Continuar cadastro gratuito"}</Button>
              <p className="text-center text-xs leading-5 text-slate-500">Seus dados serão usados somente para orientar seu cadastro e atendimento.</p>
            </form>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-lg shadow-slate-900/5 sm:p-7">
              <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></span><div><p className="text-lg font-extrabold text-slate-900">Perfeito, {form.full_name.split(" ")[0]}!</p><p className="text-sm text-slate-600">Escolha como quer concluir seu cadastro.</p></div></div>
              <div className="grid gap-4">
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5">
                  <p className="text-lg font-extrabold text-slate-900">1. Se cadastre sozinho</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Antes de abrir o site oficial, veja uma explicação rápida de como o cadastro gratuito funciona.</p>
                  <Button onClick={() => setShowSelfRegistrationInfo(true)} className="mt-4 h-12 w-full rounded-xl bg-emerald-600 font-extrabold text-white hover:bg-emerald-700">Ver como funciona <Info className="ml-2 h-4 w-4" /></Button>
                </div>
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-5">
                  <p className="text-lg font-extrabold text-slate-900">2. Fale com um consultor</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">Prefere ajuda? Abra o WhatsApp com seus dados já preenchidos e nossa equipe orienta você.</p>
                  <Button onClick={() => trackAndOpen("consultant_whatsapp", consultantLink)} variant="outline" className="mt-4 h-12 w-full rounded-xl border-emerald-600 font-extrabold text-emerald-700 hover:bg-emerald-50">Falar com um consultor <MessageCircle className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setSubmitted(false)} className="w-full py-2 text-sm font-semibold text-slate-500 underline underline-offset-4">Voltar e corrigir dados</button>
          </section>
        )}
      </div>

      {showSelfRegistrationInfo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="self-registration-title">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-emerald-600">Análise gratuita</p><h2 id="self-registration-title" className="mt-1 text-2xl font-extrabold text-slate-900">Separe estes documentos</h2></div><button type="button" onClick={() => setShowSelfRegistrationInfo(false)} aria-label="Fechar explicação" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-slate-700"><p>Vamos analisar seu cadastro para verificar se você pode receber o benefício. Isso não garante aprovação antes da análise.</p><p><strong>Importante:</strong> o nome do titular deve ser o mesmo nome que aparece na conta de energia.</p><p>Envie de preferência a <strong>conta de energia em PDF</strong> e a <strong>CNH Digital ou RG em PDF</strong>. Os arquivos não podem ter senha.</p></div>
            {!documentsSent ? (
              <div className="mt-5 space-y-4">
                <label className="block rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-4"><span className="flex items-center gap-2 font-bold text-slate-900"><FileCheck2 className="h-5 w-5 text-emerald-600" />Conta de energia</span><span className="mt-1 block text-xs text-slate-600">PDF recomendado, no nome do titular</span><input type="file" accept=".pdf,application/pdf,image/jpeg,image/png" onChange={(event) => setEnergyBill(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-sm" /></label>
                <label className="block rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4"><span className="flex items-center gap-2 font-bold text-slate-900"><Upload className="h-5 w-5 text-slate-600" />CNH Digital ou RG</span><span className="mt-1 block text-xs text-slate-600">PDF recomendado; imagem legível também é aceita</span><input type="file" accept=".pdf,application/pdf,image/jpeg,image/png" onChange={(event) => setIdentityDocument(event.target.files?.[0] ?? null)} className="mt-3 block w-full text-sm" /></label>
                <Button onClick={handleDocumentUpload} disabled={documentsLoading} className="h-12 w-full rounded-xl bg-emerald-600 font-extrabold text-white hover:bg-emerald-700">{documentsLoading ? "Enviando documentos..." : "Enviar documentos para análise"}</Button>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950"><p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Documentos recebidos com segurança.</p><p className="mt-2">Nossa equipe fará a análise. Se desejar, você também pode concluir seu cadastro no site oficial.</p><Button onClick={() => window.open(IGREEN_SELF_LINK, "_blank", "noopener,noreferrer")} className="mt-4 h-12 w-full rounded-xl bg-emerald-600 font-extrabold text-white hover:bg-emerald-700">Abrir cadastro oficial <ExternalLink className="ml-2 h-4 w-4" /></Button></div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
