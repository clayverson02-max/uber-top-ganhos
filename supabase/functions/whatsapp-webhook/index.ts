import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) return new Response(challenge ?? "", { status: 200 });
    return json({ error: "Webhook token inválido" }, 403);
  }

  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const payload = await req.json();
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const contacts = value.contacts ?? [];
        for (const message of value.messages ?? []) {
          const phone = String(message.from ?? "").replace(/\D/g, "");
          if (!phone) continue;
          const contact = contacts.find((item: any) => item.wa_id === message.from);
          const contactName = contact?.profile?.name ?? null;
          const body = message.text?.body ?? message.button?.text ?? message.interactive?.button_reply?.title ?? "[Mensagem de mídia]";
          const { data: conversation, error: conversationError } = await supabase.from("whatsapp_conversations").upsert({ phone, contact_name: contactName, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "phone" }).select("id").single();
          if (conversationError) throw conversationError;
          await supabase.from("whatsapp_messages").upsert({ conversation_id: conversation.id, wa_message_id: message.id ?? null, direction: "inbound", message_type: message.type ?? "text", body }, { onConflict: "wa_message_id", ignoreDuplicates: true });
        }
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Falha ao processar webhook" }, 500);
  }
});
