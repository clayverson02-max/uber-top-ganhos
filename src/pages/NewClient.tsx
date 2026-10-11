import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { brl, calcRevenue, normalizeWhatsapp } from "@/lib/crm";
import { uploadDoc, validatePdf } from "@/lib/docs";
import { PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const initialForm = { full_name: "", whatsapp: "", avg_bill: "" };

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
});

export default function NewClient() {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState(initialForm);
  const [fatura, setFatura] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const set = (key: keyof typeof initialForm, value: string) =>
    setF((previous) => ({ ...previous, [key]: value }));

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
    const pdfError = validatePdf(fatura);
    if (pdfError) nextErrors.fatura = pdfError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !user) return;

    const whatsapp = normalizeWhatsapp(f.whatsapp);
    const bill = Number(f.avg_bill.replace(",", "."));

    setBusy(true);
    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        origin: "whatsapp",
        full_name: f.full_name.trim(),
        email: "",
        whatsapp,
        avg_bill: bill,
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

    try {
      await uploadDoc(client.id, "fatura", fatura!, user.id);
    } catch {
      setBusy(false);
      return toast.error("Cadastro salvo, mas não foi possível enviar a fatura. Abra o cadastro novamente pelo painel.");
    }

    qc.invalidateQueries();
    setBusy(false);
    setErrors({});
    setF({ ...initialForm });
    setFatura(null);
    setFormKey((value) => value + 1);

    if (isAdmin) {
      toast.success("Cliente ativo cadastrado com bonificação de R$ 25,00.");
      nav(`/clientes/${client.id}`);
    } else {
      setCreatedClientId(client.id);
      setSuccess(true);
      toast.success("Cliente ativo cadastrado com sucesso.");
    }
  };

  const bill = Number(f.avg_bill.replace(",", "."));
  const recurrence = f.avg_bill && Number.isFinite(bill) && bill > 0 ? calcRevenue(bill) : null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <PageHeader
        title="Cadastrar cliente ativo"
        subtitle="Informe os dados básicos e envie somente o PDF da fatura."
      />

      {success && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="font-bold">Cadastro concluído</p>
            {isAdmin ? (
              <p>Cliente ativo, bonificação de R$ 25,00 registrada e fatura enviada.</p>
            ) : (
              <>
                <p>Cliente ativo e fatura enviada com sucesso.</p>
                {createdClientId && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to={`/clientes/${createdClientId}`}>Abrir conversa do cadastro</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <form key={formKey} onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="rounded-xl bg-primary/5 p-4 text-sm">
          <p className="font-bold">Cadastro rápido</p>
          <p className="mt-1 text-muted-foreground">
            O cliente entra como <strong className="text-foreground">ativo</strong> automaticamente.
          </p>
          {isAdmin && (
            <p className="mt-1 text-muted-foreground">
              A bonificação de <strong className="text-foreground">R$ 25,00</strong> é registrada no cadastro.
            </p>
          )}
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
              <p>Recorrência estimada: <strong>{brl(recurrence)}</strong> (4% da fatura)</p>
              <p className="mt-1 text-xs text-muted-foreground">O cálculo considera o valor informado acima.</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fatura">PDF da fatura de energia *</Label>
          <Input
            id="fatura"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFatura(event.target.files?.[0] ?? null)}
          />
          {errors.fatura && <p className="text-xs text-destructive">{errors.fatura}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> Apenas PDF, até 10 MB.
          </p>
        </div>

        <Button type="submit" className="h-12 w-full text-base font-bold" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Cadastrar cliente ativo
        </Button>
      </form>
    </div>
  );
}
