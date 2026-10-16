import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, UserRound, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Loading, Empty } from "@/components/crm/States";
import { toast } from "sonner";

type Conversation = { id: string; phone: string; contact_name: string | null; status: string; assigned_to: string | null; last_message_at: string };
type Message = { id: string; conversation_id: string; direction: "inbound" | "outbound"; body: string | null; created_at: string };

const statusLabel: Record<string, string> = { novo: "Novo", em_atendimento: "Em atendimento", aguardando: "Aguardando", concluido: "Concluído" };

export default function WhatsApp() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const conversations = useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("whatsapp_conversations").select("*").order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

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
      <PageHeader title="Atendimentos" subtitle="Organize as conversas da equipe em um só lugar." />
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><Wifi className="h-4 w-4" /><span>As novas mensagens e alterações aparecem automaticamente.</span></div>
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border bg-card lg:grid-cols-[320px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="border-b p-4 font-extrabold">Conversas <Badge variant="secondary" className="ml-2">{list.length}</Badge></div>
          {conversations.isLoading ? <Loading /> : list.length === 0 ? <Empty title="Nenhum atendimento ainda">Os novos atendimentos aparecerão aqui.</Empty> : <div>{list.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`flex w-full items-start gap-3 border-b p-4 text-left transition hover:bg-muted ${selected?.id === conversation.id ? "bg-muted" : ""}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{conversation.contact_name || conversation.phone}</span><span className="block text-xs text-muted-foreground">{conversation.phone}</span><span className="mt-1 block text-xs text-primary">{statusLabel[conversation.status] ?? conversation.status}</span></span></button>)}</div>}
        </aside>
        <section className="flex min-h-[620px] flex-col">
          {!selected ? <Empty title="Selecione um atendimento">Escolha um cliente para ver a conversa.</Empty> : <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><MessageCircle className="h-5 w-5" /></span><div><p className="font-extrabold">{selected.contact_name || selected.phone}</p><p className="text-sm text-muted-foreground">{selected.phone}</p></div></div><select aria-label="Status do atendimento" value={selected.status} onChange={(event) => void setStatus(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">{messages.isLoading ? <Loading /> : sortedMessages.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem registrada.</p> : sortedMessages.map((message) => <div key={message.id} className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"}`}><p>{message.body || "Mensagem sem texto"}</p><p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString("pt-BR")}</p></div></div>)}</div>
            <form onSubmit={sendMessage} className="flex gap-2 border-t p-4"><Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Digite uma resposta..." disabled={sending} /><Button type="submit" disabled={sending || !text.trim()}><Send className="mr-2 h-4 w-4" />Enviar</Button></form>
          </>}
        </section>
      </div>
    </div>
  );
}
