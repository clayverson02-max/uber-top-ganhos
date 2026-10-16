import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, MessageCircle, QrCode, RefreshCw, Save, Send, UserRound, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Loading, Empty } from "@/components/crm/States";
import { toast } from "sonner";

type Conversation = { id: string; phone: string; contact_name: string | null; status: string; assigned_to: string | null; last_message_at: string };
type Message = { id: string; conversation_id: string; direction: "inbound" | "outbound"; body: string | null; created_at: string };
type AiSettings = { id: number; enabled: boolean; auto_reply: boolean; system_prompt: string };

const statusLabel: Record<string, string> = { novo: "Novo", em_atendimento: "Em atendimento", aguardando: "Aguardando", concluido: "Concluído" };

export default function WhatsApp() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState("Não conectado");
  const [qrLoading, setQrLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingAi, setSavingAi] = useState(false);

  const conversations = useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("whatsapp_conversations").select("*").order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const aiSettings = useQuery({
    queryKey: ["whatsapp-ai-settings"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("whatsapp_ai_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data as AiSettings | null;
    },
  });

  useEffect(() => {
    if (!aiSettings.data) return;
    setAiEnabled(aiSettings.data.enabled);
    setAutoReply(aiSettings.data.auto_reply);
    setSystemPrompt(aiSettings.data.system_prompt || "");
  }, [aiSettings.data]);

  const list = conversations.data ?? [];
  const selected = list.find((item) => item.id === selectedId) ?? list[0] ?? null;
  const messages = useQuery({
    queryKey: ["whatsapp-messages", selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("whatsapp_messages").select("*").eq("conversation_id", selected!.id).order("created_at");
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  useEffect(() => {
    const channel = supabase.channel("whatsapp-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
        qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);

  const sortedMessages = useMemo(() => messages.data ?? [], [messages.data]);

  async function callQr(action: "connect" | "qr" | "status") {
    setQrLoading(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-qr", { body: { action } });
    setQrLoading(false);
    if (error) return toast.error("Não foi possível conectar: " + error.message);
    const payload = data ?? {};
    const base64 = payload.qrcode?.base64 ?? payload.base64 ?? payload.qr?.base64;
    if (base64) setQrCode(base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`);
    const state = payload.state ?? payload.instance?.state ?? payload.instance?.connectionStatus;
    if (state) setConnectionState(state === "open" ? "Conectado" : state);
    if (!base64 && action !== "status") toast.info("A instância foi solicitada. Clique em atualizar para consultar o QR Code.");
  }

  async function saveAiSettings() {
    setSavingAi(true);
    const { error } = await (supabase as any).from("whatsapp_ai_settings").update({ enabled: aiEnabled, auto_reply: autoReply, system_prompt: systemPrompt.trim(), updated_at: new Date().toISOString() }).eq("id", 1);
    setSavingAi(false);
    if (error) return toast.error("Não foi possível salvar o agente: " + error.message);
    toast.success("Configuração do agente salva.");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!selected || !body || sending) return;
    setSending(true);
    const { error } = await supabase.functions.invoke("whatsapp-send", { body: { conversation_id: selected.id, phone: selected.phone, text: body } });
    setSending(false);
    if (error) return toast.error("Não foi possível enviar: " + error.message);
    setText("");
    await messages.refetch();
    await conversations.refetch();
  }

  async function setStatus(status: string) {
    if (!selected) return;
    const { error } = await (supabase as any).from("whatsapp_conversations").update({ status, updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    await conversations.refetch();
  }

  return (
    <div>
      <PageHeader title="WhatsApp" subtitle="Acompanhe os atendimentos da equipe em tempo real." />
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><Wifi className="h-4 w-4" /><span>As mensagens novas aparecem automaticamente nesta tela.</span></div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><QrCode className="h-5 w-5" /></span><div><h2 className="font-extrabold">Conectar WhatsApp</h2><p className="mt-1 text-sm text-muted-foreground">Abra o WhatsApp no celular, entre em Dispositivos conectados e escaneie o QR Code.</p></div></div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><Badge variant={connectionState === "open" || connectionState === "Conectado" ? "default" : "secondary"}>{connectionState}</Badge><Button size="sm" onClick={() => void callQr("connect")} disabled={qrLoading}>{qrLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}Gerar QR Code</Button><Button size="sm" variant="outline" onClick={() => void callQr("status")} disabled={qrLoading}><RefreshCw className="mr-2 h-4 w-4" />Atualizar status</Button></div>
          {qrCode && <div className="mt-4 flex justify-center rounded-xl bg-white p-4"><img src={qrCode} alt="QR Code para conectar o WhatsApp" className="h-52 w-52 object-contain" /></div>}
          <p className="mt-3 text-xs text-muted-foreground">O QR Code só aparece depois que o servidor de conexão do WhatsApp estiver configurado.</p>
        </section>

        {isAdmin && <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-amber-100 p-3 text-amber-700"><Bot className="h-5 w-5" /></span><div><h2 className="font-extrabold">Agente de atendimento</h2><p className="mt-1 text-sm text-muted-foreground">Defina como a IA deve responder. Deixe a resposta automática desligada até revisar o texto.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} /> Ativar agente</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={autoReply} onChange={(event) => setAutoReply(event.target.checked)} /> Responder automaticamente</label></div>
          <Textarea className="mt-4 min-h-28" value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} placeholder="Ex.: Responda em português, seja claro, nunca prometa algo que não foi confirmado e encaminhe dúvidas para um atendente." />
          <Button className="mt-3" onClick={() => void saveAiSettings()} disabled={savingAi}><Save className="mr-2 h-4 w-4" />{savingAi ? "Salvando..." : "Salvar agente"}</Button>
        </section>}
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border bg-card lg:grid-cols-[320px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="border-b p-4 font-extrabold">Conversas <Badge variant="secondary" className="ml-2">{list.length}</Badge></div>
          {conversations.isLoading ? <Loading /> : list.length === 0 ? <Empty title="Nenhuma conversa ainda">Quando uma mensagem chegar, ela aparecerá aqui.</Empty> : <div>{list.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`flex w-full items-start gap-3 border-b p-4 text-left transition hover:bg-muted ${selected?.id === conversation.id ? "bg-muted" : ""}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{conversation.contact_name || conversation.phone}</span><span className="block text-xs text-muted-foreground">{conversation.phone}</span><span className="mt-1 block text-xs text-primary">{statusLabel[conversation.status] ?? conversation.status}</span></span></button>)}</div>}
        </aside>
        <section className="flex min-h-[620px] flex-col">
          {!selected ? <Empty title="Selecione uma conversa">Escolha um atendimento para acompanhar.</Empty> : <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><p className="font-extrabold">{selected.contact_name || selected.phone}</p><p className="text-sm text-muted-foreground">{selected.phone}</p></div><select value={selected.status} onChange={(event) => void setStatus(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">{messages.isLoading ? <Loading /> : sortedMessages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem registrada.</p> : sortedMessages.map((message) => <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"}`}><p>{message.body || "Mensagem sem texto"}</p><p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString("pt-BR")}</p></div></div>)}</div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t p-4"><Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Digite uma resposta..." disabled={sending} /><Button type="submit" disabled={sending || !text.trim()}><Send className="mr-2 h-4 w-4" />Enviar</Button></form>
          </>}
        </section>
      </div>
    </div>
  );
}
