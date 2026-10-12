import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, IdCard, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl, calcRevenue, normalizeWhatsapp } from "@/lib/crm";
import { uploadDoc, validateDocument, validatePdf } from "@/lib/docs";
import { PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initialForm = {
  full_name: "",
  whatsapp: "",
  avg_bill: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  consumo_medio_kwh: "",
  numero_instalacao: "",
};

const manualFields = [
  { key: "cep", label: "CEP", placeholder: "00000-000" },
  { key: "logradouro", label: "Logradouro", placeholder: "Rua, avenida ou estrada" },
  { key: "numero", label: "Número", placeholder: "Ex.: 123" },
  { key: "complemento", label: "Complemento", placeholder: "Casa, apto. (opcional)", optional: true },
  { key: "bairro", label: "Bairro", placeholder: "Ex.: Centro" },
  { key: "cidade", label: "Cidade", placeholder: "Ex.: Caucaia" },
  { key: "estado", label: "Estado (UF)", placeholder: "CE" },
  { key: "consumo_medio_kwh", label: "Consumo médio mensal (kWh)", placeholder: "Ex.: 250" },
  { key: "numero_instalacao", label: "Número de instalação", placeholder: "Está na conta de energia" },
] as const;

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo").max(150),
  whatsapp: z.string().refine(
    (v) => /^55\d{10,11}$/.test(normalizeWhatsapp(v)),
    "Informe um WhatsApp válido com DDD"
  ),
  avg_bill: z.string().refine((v) => {
    const value = Number(v.replace(",", "."));
    return v.trim() !== "" && Number.isFinite(value) && value > 0;
  }, "Informe quanto a pessoa paga por mês"),
  cep: z.string().max(9),
  logradouro: z.string().max(200),
  numero: z.string().max(30),
  complemento: z.string().max(100),
  bairro: z.string().max(100),
  cidade: z.string().max(100),
  estado: z.string().max(2),
  consumo_medio_kwh: z.string().refine((v) => {
    if (!v.trim()) return true;
    const value = Number(v.replace(",", "."));
    return Number.isFinite(value) && value >= 0;
  }, "Informe um consumo válido"),
  numero_instalacao: z.string().max(80),
});

export default function NewClient() {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState(initialForm);
  const [fatura, setFatura] = useState<File | null>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const set = (key: keyof typeof initialForm, value: string) =>
    setF((previous) => ({ ...previous, [key]: value }));

  const validateManualFields = () => {
    const manualErrors: Record<string, string> = {};
    manualFields.forEach(({ key, label, optional }) => {
      if (!optional && !f[key].trim()) {
        manualErrors[key] = "Informe " + label.toLowerCase() + " quando não houver o PDF";
      }
    });
    return manualErrors;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSuccess(false);
    setCreatedClientId(null);

    const parsed = schema.safeParse(f);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        nextErrors[String(issue.path[0])] = issue.message;
      });
    }

    if (fatura) {
      const pdfError = validatePdf(fatura);
      if (pdfError) nextErrors.fatura = pdfError;
    } else {
      Object.assign(nextErrors, validateManualFields());
      if (Object.keys(validateManualFields()).length) {
        nextErrors.fatura = "Envie a fatura em PDF ou preencha os dados da instalação abaixo";
        setManualMode(true);
      }
    }

    if (documento) {
      const documentError = validateDocument(documento);
      if (documentError) nextErrors.documento = documentError;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !user) return;

    const whatsapp = normalizeWhatsapp(f.whatsapp);
    const bill = Number(f.avg_bill.replace(",", "."));
    const consumption = f.consumo_medio_kwh.trim()
      ? Number(f.consumo_medio_kwh.replace(",", "."))
      : null;

    setBusy(true);
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        origin: "whatsapp",
        full_name: f.full_name.trim(),
        email: "",
        whatsapp,
        avg_bill: bill,
        cep: f.cep.trim() || null,
        logradouro: f.logradouro.trim() || null,
        numero: f.numero.trim() || null,
        complemento: f.complemento.trim() || null,
        bairro: f.bairro.trim() || null,
        cidade: f.cidade.trim() || null,
        estado: f.estado.trim().toUpperCase() || null,
        consumo_medio_kwh: consumption,
        numero_instalacao: f.numero_instalacao.trim() || null,
        responsible_id: user.id,
        created_by: user.id,
        status: "cliente_ativo",
      })
      .select()
      .single();

    if (error || !client) {
      setBusy(false);
      return toast.error("Não foi possível salvar: " + (error?.message ?? "tente novamente"));
    }

    const uploadProblems: string[] = [];
    if (fatura) {
      try {
        await uploadDoc(client.id, "fatura", fatura, user.id);
      } catch {
        uploadProblems.push("a fatura");
      }
    }
    if (documento) {
      try {
        await uploadDoc(client.id, "documento_foto", documento, user.id);
      } catch {
        uploadProblems.push("o RG/CNH");
      }
    }

    qc.invalidateQueries();
    setBusy(false);
    setErrors({});
    setF({ ...initialForm });
    setFatura(null);
    setDocumento(null);
    setManualMode(false);
    setFormKey((value) => value + 1);

    const message = fatura
      ? "Cliente ativo e fatura enviada com sucesso."
      : "Cliente ativo cadastrado com os dados da instalação. A fatura pode ser anexada depois.";
    setSuccessMessage(message);

    if (uploadProblems.length) {
      toast.warning("Cadastro salvo, mas não foi possível enviar " + uploadProblems.join(" e ") + ". A equipe pode anexar depois.");
    } else {
      toast.success("Cliente ativo cadastrado com sucesso.");
    }

    if (isAdmin) {
      nav("/clientes/" + client.id);
    } else {
      setCreatedClientId(client.id);
      setSuccess(true);
    }
  };

  const bill = Number(f.avg_bill.replace(",", "."));
  const recurrence = f.avg_bill && Number.isFinite(bill) && bill > 0 ? calcRevenue(bill) : null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Cadastrar cliente ativo"
        subtitle="A fatura em PDF é o caminho preferencial. Se o cliente não tiver o arquivo, preencha os dados da instalação."
      />

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="font-bold">Cadastro concluído</p>
            <p>{successMessage}</p>
            {createdClientId && (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to={"/clientes/" + createdClientId}>Abrir conversa do cadastro</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <form key={formKey} onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="rounded-xl bg-primary/5 p-4 text-sm">
          <p className="font-bold">Cadastro rápido</p>
          <p className="mt-1 text-muted-foreground">
            O cliente entra como <strong className="text-foreground">ativo</strong> automaticamente. A fatura em PDF ajuda a conferir os dados, mas não impede o primeiro cadastro.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="full_name">Nome completo *</Label>
          <Input
            id="full_name"
            autoComplete="name"
            value={f.full_name}
            maxLength={150}
            onChange={(event) => set("full_name", event.target.value)}
            placeholder="Ex.: Maria da Silva"
          />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp *</Label>
          <Input
            id="whatsapp"
            inputMode="tel"
            autoComplete="tel"
            value={f.whatsapp}
            maxLength={20}
            onChange={(event) => set("whatsapp", event.target.value)}
            placeholder="(85) 99999-9999"
          />
          {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="avg_bill">Quanto paga de energia por mês? *</Label>
          <Input
            id="avg_bill"
            inputMode="decimal"
            value={f.avg_bill}
            onChange={(event) => set("avg_bill", event.target.value)}
            placeholder="Ex.: 500,00"
          />
          {errors.avg_bill && <p className="text-xs text-destructive">{errors.avg_bill}</p>}
          {isAdmin && (
            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <p>Comissão recorrente estimada: <strong>{brl(recurrence)}</strong> (4% mensal da fatura)</p>
              <p className="mt-1 text-xs text-muted-foreground">O cálculo considera o valor informado acima.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-bold">Fatura de energia — PDF preferencial</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Se tiver a fatura em PDF, envie aqui. Ela facilita a conferência e acelera a análise do cadastro.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="fatura">PDF da fatura de energia</Label>
            <Input
              id="fatura"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFatura(event.target.files?.[0] ?? null)}
            />
            {errors.fatura && <p className="text-xs text-destructive">{errors.fatura}</p>}
            <p className="text-xs text-muted-foreground">Apenas PDF, até 10 MB. Se não tiver agora, use a alternativa manual abaixo.</p>
          </div>
          <button
            type="button"
            onClick={() => setManualMode((value) => !value)}
            className="mt-4 inline-flex items-center gap-2 text-left text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            <MapPin className="h-4 w-4" />
            {manualMode ? "Ocultar dados da instalação" : "Não tenho o PDF agora — preencher dados da instalação"}
          </button>
        </div>

        {manualMode && (
          <div className="rounded-xl border border-dashed border-primary/30 bg-muted/20 p-4">
            <div className="mb-4">
              <p className="font-bold">Dados da instalação</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Preencha estes dados quando o cliente não puder enviar a fatura em PDF. O complemento é opcional; os demais campos ajudam a localizar a instalação.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {manualFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={field.key}>
                    {field.label}{field.optional ? " (opcional)" : " *"}
                  </Label>
                  <Input
                    id={field.key}
                    value={f[field.key]}
                    maxLength={field.key === "estado" ? 2 : undefined}
                    inputMode={field.key === "consumo_medio_kwh" ? "decimal" : field.key === "cep" ? "numeric" : undefined}
                    onChange={(event) => set(field.key, field.key === "estado" ? event.target.value.toUpperCase() : event.target.value)}
                    placeholder={field.placeholder}
                  />
                  {errors[field.key] && <p className="text-xs text-destructive">{errors[field.key]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-dashed p-4">
          <div className="flex items-start gap-3">
            <IdCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="font-bold">RG ou CNH (opcional no cadastro inicial)</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pode ser um PDF ou uma foto legível do documento. Se o cliente ainda não tiver, a equipe interna poderá solicitar depois pela conversa do cadastro.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="documento">Documento com foto</Label>
            <Input
              id="documento"
              type="file"
              accept="application/pdf,image/*"
              onChange={(event) => setDocumento(event.target.files?.[0] ?? null)}
            />
            {errors.documento && <p className="text-xs text-destructive">{errors.documento}</p>}
            <p className="text-xs text-muted-foreground">Aceita PDF, JPG, PNG ou WEBP, até 10 MB.</p>
          </div>
        </div>

        <Button type="submit" className="h-12 w-full text-base font-bold" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Cadastrar cliente ativo
        </Button>
      </form>
    </div>
  );
}
