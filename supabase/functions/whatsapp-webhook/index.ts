import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const constantTimeEqual = (left: string, right: string) => left.length === right.length && [...left].reduce((same, char, index) => same && char === right[index], true);

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
    const rawBody = await req.text();
    const appSecret = Deno.env.get("META_APP_SECRET");
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    if (!appSecret || !signature.startsWith("sha256=")) return json({ error: "Webhook não configurado" }, 503);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = "sha256=" + [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    if (!constantTimeEqual(signature, expected)) return json({ error: "Assinatura inválida" }, 401);
    const payload = JSON.parse(rawBody);
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
