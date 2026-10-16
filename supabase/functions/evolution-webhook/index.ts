import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const secret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
  const received = req.headers.get("apikey") ?? req.headers.get("x-api-key") ?? "";
  if (!secret || received !== secret) return json({ error: "Webhook não autorizado" }, 401);

  try {
    const payload = await req.json();
    const event = String(payload.event ?? "").toUpperCase();
    if (!["MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"].includes(event)) return json({ received: true });

    const data = payload.data ?? {};
    const key = data.key ?? {};
    const remoteJid = String(key.remoteJid ?? "");
    if (!remoteJid || remoteJid.endsWith("@g.us") || remoteJid === "status@broadcast") return json({ received: true });
    const phone = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
    if (!phone) return json({ received: true });

    const contactName = data.pushName ?? null;
    const message = data.message ?? {};
    const body = message.conversation ?? message.extendedTextMessage?.text ?? message.imageMessage?.caption ?? message.videoMessage?.caption ?? "[Mensagem de mídia]";
    const direction = key.fromMe ? "outbound" : "inbound";
    const { data: conversation, error: conversationError } = await supabase.from("whatsapp_conversations").upsert({ phone, contact_name: contactName, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "phone" }).select("id").single();
    if (conversationError) throw conversationError;
    await supabase.from("whatsapp_messages").upsert({ conversation_id: conversation.id, wa_message_id: key.id ?? null, direction, message_type: Object.keys(message)[0] ?? "text", body: String(body), }, { onConflict: "wa_message_id", ignoreDuplicates: true });
    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Falha ao processar evento" }, 500);
  }
});
