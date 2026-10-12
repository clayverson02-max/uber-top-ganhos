import { useEffect, useState, type FormEvent } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Upload, Eye, MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useCrmData";
import { DOC_STATUSES, DOC_TYPES, ORIGINS, STATUSES, brl, calcRevenue, fmtDate, fmtDateTime, fmtMonth, fmtWhatsapp, normalizeWhatsapp, statusLabel, pendencies, type ClientStatus, type DocStatus, type DocType } from "@/lib/crm";
import { downloadDoc, openDoc, uploadDoc, validateDocument, validatePdf } from "@/lib/docs";
import { StatusBadge, DocBadge } from "@/components/crm/StatusBadge";
import { Loading, Empty } from "@/components/crm/States";
import { WhatsappActions } from "@/components/crm/WhatsappActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, profile, isAdmin, isInternal } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const pname = (u: string | null) => profiles.find((p) => p.id === u)?.full_name || "—";
  const canManage = isAdmin || isInternal;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [c, d, h, r] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id!).maybeSingle(),
        supabase.from("client_documents").select("*").eq("client_id", id!).order("uploaded_at", { ascending: false }),
        supabase.from("client_history").select("*").eq("client_id", id!).order("created_at", { ascending: false }),
        supabase.from("monthly_revenues").select("*").eq("client_id", id!).order("reference_month", { ascending: false }),
      ]);
      return { client: c.data, docs: d.data ?? [], history: h.data ?? [], revenues: r.data ?? [] };
    },
  });
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["client-messages", id],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("client_messages")
        .select("*")
        .eq("client_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return rows;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

  const [f, setF] = useState<Record<string, string>>({});
  const [contactNote, setContactNote] = useState("");
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  useEffect(() => {
    if (data?.client) {
      const c = data.client;
      setF({
        full_name: c.full_name,
        email: c.email,
        whatsapp: c.whatsapp,
        origin: c.origin,
        avg_bill: c.avg_bill?.toString() ?? "",
        cep: c.cep ?? "",
        logradouro: c.logradouro ?? "",
        numero: c.numero ?? "",
        complemento: c.complemento ?? "",
        bairro: c.bairro ?? "",
        cidade: c.cidade ?? "",
        estado: c.estado ?? "",
        consumo_medio_kwh: c.consumo_medio_kwh?.toString() ?? "",
        numero_instalacao: c.numero_instalacao ?? "",
        notes: c.notes ?? "",
        last_contact_at: c.last_contact_at ?? "",
        next_contact_at: c.next_contact_at ?? "",
        responsible_id: c.responsible_id ?? "",
      });
    }
  }, [data?.client]);

  if (isLoading) return <Loading />;
  if (!data?.client) return <Empty title="Cliente não encontrado ou sem permissão" />;
  const c = data.client;
  const reload = () => {
    refetch();
    refetchMessages();
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["docs"] });
  };
  const log = (kind: string, description: string) => supabase.from("client_history").insert({ client_id: c.id, user_id: user!.id, kind, description });
  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !user) return;
    setSendingMessage(true);
    const { error } = await supabase.from("client_messages").insert({
      client_id: c.id,
      sender_id: user.id,
      message: text,
    });
    setSendingMessage(false);
    if (error) return toast.error("Não foi possível enviar a mensagem: " + error.message);
    setMessage("");
    refetchMessages();
  };

  const setStatus = async (s: ClientStatus) => {
    const { error } = await supabase.from("clients").update({ status: s }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado"); reload();
  };
  const save = async () => {
    const wa = normalizeWhatsapp(f.whatsapp);
    if (f.full_name.trim().length < 3) return toast.error("Nome inválido");
    const email = f.email.trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("E-mail inválido");
    if (!/^55\d{10,11}$/.test(wa)) return toast.error("WhatsApp inválido");
    const bill = f.avg_bill ? Number(f.avg_bill.replace(",", ".")) : null;
    if (bill != null && (isNaN(bill) || bill < 0)) return toast.error("Valor da fatura inválido");
    const consumption = f.consumo_medio_kwh?.trim()
      ? Number(f.consumo_medio_kwh.replace(",", "."))
      : null;
    if (consumption != null && (isNaN(consumption) || consumption < 0)) return toast.error("Consumo médio inválido");
    const { data: dups } = await supabase.rpc("find_duplicates", { _whatsapp: wa, _email: f.email.trim(), _exclude: c.id });
    if (dups?.length) toast.warning(`Atenção: existe registro semelhante (#${dups[0].code} ${dups[0].full_name})`);
    const { error } = await supabase.from("clients").update({
      full_name: f.full_name.trim(),
      email,
      whatsapp: wa,
      origin: f.origin,
      avg_bill: bill,
      cep: f.cep?.trim() || null,
      logradouro: f.logradouro?.trim() || null,
      numero: f.numero?.trim() || null,
      complemento: f.complemento?.trim() || null,
      bairro: f.bairro?.trim() || null,
      cidade: f.cidade?.trim() || null,
      estado: f.estado?.trim().toUpperCase() || null,
      consumo_medio_kwh: consumption,
      numero_instalacao: f.numero_instalacao?.trim() || null,
      notes: f.notes.trim() || null,
      last_contact_at: f.last_contact_at || null,
      next_contact_at: f.next_contact_at || null,
      responsible_id: f.responsible_id || null,
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await log("edicao", "Dados do cadastro editados");
    toast.success("Alterações salvas"); reload();
  };
  const registerContact = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("clients").update({ last_contact_at: today, stopped_responding: false }).eq("id", c.id);
    await log("contato", `Contato registrado${contactNote.trim() ? ": " + contactNote.trim().slice(0, 500) : ""}`);
    setContactNote(""); toast.success("Contato registrado"); reload();
  };
  const toggleStopped = async (v: boolean) => {
    await supabase.from("clients").update({ stopped_responding: v }).eq("id", c.id);
    await log("contato", v ? "Marcado: parou de responder" : "Desmarcado: parou de responder"); reload();
  };
  const setDocStatus = async (docId: string, s: DocStatus) => {
    const { error } = await supabase.from("client_documents").update({ status: s }).eq("id", docId);
    if (error) return toast.error(error.message);
    await log("documento", `Status de documento alterado para ${s}`); reload();
  };
  const replace = async (t: DocType, file?: File) => {
    const err = t === "fatura" ? validatePdf(file) : validateDocument(file);
    if (err) return toast.error(err);
    try {
      await uploadDoc(c.id, t, file!, user!.id);
      toast.success("Documento enviado");
      reload();
    } catch {
      toast.error("Falha no envio do documento");
    }
  };
  const softDelete = async () => {
    if (!confirm("Arquivar este registro? Ele deixa de aparecer nas listas, mas o histórico é mantido.")) return;
    const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
    if (error) return toast.error(error.message);
    await log("edicao", "Registro arquivado (exclusão lógica)");
    toast.success("Registro arquivado");
    nav("/lixeira");
  };

  const pend = pendencies(c, data.docs);
  const statusHist = data.history.filter((h) => h.kind === "status");
  const contactHist = data.history.filter((h) => h.kind === "contato");

  return (
    <div className="space-y-5">
      <Link to="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Voltar</Link>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">#{c.code} · cadastrado em {fmtDateTime(c.created_at)} por {pname(c.created_by)} · atualizado {fmtDateTime(c.updated_at)}</p>
          <h1 className="text-2xl font-extrabold">{c.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm"><StatusBadge status={c.status} /><span>{fmtWhatsapp(c.whatsapp)}</span><span className="text-muted-foreground">{ORIGINS[c.origin as keyof typeof ORIGINS]}</span></div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <WhatsappActions whatsapp={c.whatsapp} />
          {canManage && (
          <Select value={c.status} onValueChange={(v) => setStatus(v as ClientStatus)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          )}
        </div>
      </div>

      {isAdmin ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Valor médio da fatura</p>
            <p className="text-xl font-bold">{brl(c.avg_bill)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Recorrência mensal estimada (4%)</p>
            <p className="text-xl font-bold text-success">{brl(calcRevenue(c.avg_bill))}</p>
            <p className="text-xs text-muted-foreground">{c.avg_bill != null ? brl(c.avg_bill) + " × 0,04" : "Informe o valor da fatura"}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Valor informado na fatura</p>
            <p className="text-xl font-bold">{brl(c.avg_bill)}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Situação do cadastro</p>
            <p className="mt-1 font-bold">{statusLabel(c.status)}</p>
          </div>
        </div>
      )}

      {pend.length > 0 && <div className="rounded-xl border border-warning/40 bg-accent/10 p-4 text-sm"><span className="font-semibold">Pendências: </span>{pend.join(" · ")}</div>}

      {canManage && (
      <>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-bold">Dados e edição</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Nome completo</Label><Input value={f.full_name ?? ""} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>WhatsApp</Label><Input value={f.whatsapp ?? ""} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></div>
            <div className="space-y-1"><Label>Origem</Label>
              <Select value={f.origin} onValueChange={(v) => setF({ ...f, origin: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="anuncio">Anúncio</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Valor médio da fatura (R$)</Label><Input inputMode="decimal" value={f.avg_bill ?? ""} onChange={(e) => setF({ ...f, avg_bill: e.target.value })} /></div>
            <div className="space-y-1"><Label>Responsável</Label>
              <Select value={f.responsible_id} onValueChange={(v) => setF({ ...f, responsible_id: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{profiles.filter((p) => p.active).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label>Último contato</Label><Input type="date" value={f.last_contact_at ?? ""} onChange={(e) => setF({ ...f, last_contact_at: e.target.value })} /></div>
            <div className="space-y-1"><Label>Próximo contato</Label><Input type="date" value={f.next_contact_at ?? ""} onChange={(e) => setF({ ...f, next_contact_at: e.target.value })} /></div>
          </div>
          <div className="mt-5 border-t pt-4">
            <h3 className="font-semibold">Dados da instalação</h3>
            <p className="mt-1 text-xs text-muted-foreground">Podem completar o cadastro quando a fatura em PDF ainda não foi enviada.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>CEP</Label><Input value={f.cep ?? ""} onChange={(e) => setF({ ...f, cep: e.target.value })} placeholder="00000-000" /></div>
              <div className="space-y-1"><Label>Logradouro</Label><Input value={f.logradouro ?? ""} onChange={(e) => setF({ ...f, logradouro: e.target.value })} /></div>
              <div className="space-y-1"><Label>Número</Label><Input value={f.numero ?? ""} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
              <div className="space-y-1"><Label>Complemento</Label><Input value={f.complemento ?? ""} onChange={(e) => setF({ ...f, complemento: e.target.value })} placeholder="Opcional" /></div>
              <div className="space-y-1"><Label>Bairro</Label><Input value={f.bairro ?? ""} onChange={(e) => setF({ ...f, bairro: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cidade</Label><Input value={f.cidade ?? ""} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></div>
              <div className="space-y-1"><Label>Estado (UF)</Label><Input maxLength={2} value={f.estado ?? ""} onChange={(e) => setF({ ...f, estado: e.target.value.toUpperCase() })} placeholder="CE" /></div>
              <div className="space-y-1"><Label>Consumo médio mensal (kWh)</Label><Input inputMode="decimal" value={f.consumo_medio_kwh ?? ""} onChange={(e) => setF({ ...f, consumo_medio_kwh: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Número de instalação</Label><Input value={f.numero_instalacao ?? ""} onChange={(e) => setF({ ...f, numero_instalacao: e.target.value })} placeholder="Número que aparece no papel de energia" /></div>
            </div>
          </div>
          <div className="mt-3 space-y-1"><Label>Observações</Label><Textarea maxLength={2000} value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="mt-4 flex flex-wrap gap-2"><Button onClick={save}>Salvar alterações</Button>{isAdmin && <Button variant="outline" onClick={softDelete}>Arquivar registro</Button>}</div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 font-bold">Documentos (protegidos)</h2>
          <div className="space-y-3">
            {(Object.keys(DOC_TYPES) as DocType[]).map((t) => {
              const d = data.docs.find((x) => x.doc_type === t && x.is_current);
              return (
                <div key={t} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />{DOC_TYPES[t]}</p>{d ? <DocBadge status={d.status} /> : <DocBadge status="pendente" />}</div>
                  {d && <p className="mt-1 break-all text-xs text-muted-foreground">{d.file_name} · {fmtDateTime(d.uploaded_at)} · por {pname(d.uploaded_by)}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const popup = window.open("about:blank", "_blank");
                            try {
                              await openDoc(d.file_path, popup);
                            } catch {
                              popup?.close();
                              toast.error("Não foi possível abrir o arquivo. Verifique seu acesso.");
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />Ver arquivo
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            downloadDoc(d.file_path, d.file_name).catch(() =>
                              toast.error("Não foi possível baixar o arquivo. Verifique seu acesso.")
                            )
                          }
                        >
                          <Download className="h-4 w-4" />Baixar arquivo
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" asChild><label className="cursor-pointer"><Upload className="h-4 w-4" />{d ? "Substituir" : "Enviar"}
                      <input type="file" accept={t === "fatura" ? "application/pdf,.pdf" : "application/pdf,image/*"} className="hidden" onChange={(e) => { replace(t, e.target.files?.[0]); e.target.value = ""; }} /></label></Button>
                    {d && <Select value={d.status} onValueChange={(v) => setDocStatus(d.id, v as DocStatus)}><SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{DOC_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-bold">Contatos</h2>
          <div className="mb-3 flex items-center gap-2 text-sm"><Switch checked={c.stopped_responding} onCheckedChange={toggleStopped} />Parou de responder</div>
          <div className="flex gap-2"><Input placeholder="Resumo do contato (opcional)" value={contactNote} maxLength={500} onChange={(e) => setContactNote(e.target.value)} /><Button onClick={registerContact}>Registrar</Button></div>
          <ul className="mt-4 space-y-2 text-sm">{contactHist.length ? contactHist.map((h) => <li key={h.id} className="border-l-2 border-primary pl-3"><p>{h.description}</p><p className="text-xs text-muted-foreground">{fmtDateTime(h.created_at)} · {pname(h.user_id)}</p></li>) : <li className="text-muted-foreground">Nenhum contato registrado.</li>}</ul>
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-bold">Histórico de status e alterações</h2>
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">{data.history.filter((h) => h.kind !== "contato").map((h) => {
            let desc = h.description; STATUSES.forEach((s) => (desc = desc.split(s.value).join(s.label)));
            return <li key={h.id} className="border-l-2 border-secondary pl-3"><p>{desc}</p><p className="text-xs text-muted-foreground">{fmtDateTime(h.created_at)} · {pname(h.user_id)}</p></li>;
          })}</ul>
          <p className="mt-2 text-xs text-muted-foreground">{statusHist.length} mudança(s) de status</p>
        </section>
      </div>
       <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-bold">Conversa do cadastro</h2>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircle className="h-4 w-4 text-primary" />
          Use esta conversa para registrar o contato e solicitar as informações pendentes.
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-muted/40 p-3">
          {messagesLoading ? (
            <p className="text-sm text-muted-foreground">Carregando conversa...</p>
          ) : messages.length ? (
            messages.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-3 text-sm">
                <p className="whitespace-pre-wrap">{item.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.sender_id === user?.id ? (profile?.full_name || "Você") : (pname(item.sender_id) === "—" ? "Equipe interna" : pname(item.sender_id))}
                  {" · "}{fmtDateTime(item.created_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Registre aqui o contato com o cliente.</p>
          )}
        </div>
        <form onSubmit={sendMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder={isInternal ? "Ex.: Solicitei CNH ou RG ao cliente." : "Avise a equipe interna sobre este cliente..."}
          />
          <Button type="submit" disabled={sendingMessage || !message.trim()} className="sm:self-end">
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </form>
      </section>

      {isAdmin && (
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 font-bold">Histórico mensal de receita</h2>
        {data.revenues.length ? (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Mês</th><th>Fatura</th><th>%</th><th>Receita</th><th>Tipo</th><th>Recebimento</th><th>Obs.</th></tr></thead>
            <tbody>{data.revenues.map((r) => <tr key={r.id} className="border-t"><td className="py-2 capitalize">{fmtMonth(r.reference_month)}</td><td>{brl(r.bill_amount)}</td><td>{(Number(r.percent) * 100).toFixed(0)}%</td><td className="font-semibold text-success">{brl(r.revenue)}</td><td>{r.is_estimate ? "Estimativa" : "Real"}</td><td>{r.receipt_status === "recebido" ? "Recebido" : "Pendente"}</td><td>{r.notes ?? "—"}</td></tr>)}</tbody></table></div>
        ) : <p className="text-sm text-muted-foreground">Sem registros mensais. {isAdmin ? "Gere os registros do mês na área Financeiro." : ""}</p>}
      </section>
      )}
      </>)}
    </div>
  );
}
