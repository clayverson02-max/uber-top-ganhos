import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await authClient.auth.getUser();
    if (!userData.user) return json({ error: "Não autenticado" }, 401);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).in("role", ["admin", "interno"]).maybeSingle();
    if (!role) return json({ error: "Sem permissão" }, 403);

    const { conversation_id, phone, text } = await req.json();
    if (!conversation_id || !phone || !String(text ?? "").trim()) return json({ error: "Dados incompletos" }, 400);

    const evolutionBase = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
    const evolutionKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE_NAME") ?? "conta-amiga";
    if (evolutionBase && evolutionKey) {
      const evolutionResponse = await fetch(`${evolutionBase}/message/sendText/${encodeURIComponent(evolutionInstance)}`, {
        method: "POST",
        headers: { apikey: evolutionKey, "Content-Type": "application/json" },
        body: JSON.stringify({ number: String(phone).replace(/\D/g, ""), text: String(text).trim() }),
      });
      const evolutionResult = await evolutionResponse.json();
      if (!evolutionResponse.ok) return json({ error: evolutionResult?.message ?? "Evolution API recusou o envio" }, 502);
      await admin.from("whatsapp_messages").insert({ conversation_id, direction: "outbound", message_type: "text", body: String(text).trim(), sent_by: userData.user.id, wa_message_id: evolutionResult?.key?.id ?? null });
      await admin.from("whatsapp_conversations").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: "em_atendimento", assigned_to: userData.user.id }).eq("id", conversation_id);
      return json({ ok: true, result: evolutionResult });
    }

    const version = Deno.env.get("META_GRAPH_API_VERSION") ?? "v23.0";
    const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
    const token = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
    if (!phoneNumberId || !token) return json({ error: "WhatsApp Business ainda não configurado no Supabase" }, 503);

    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: String(phone).replace(/\D/g, ""), type: "text", text: { body: String(text).trim() } }),
    });
    const result = await response.json();
    if (!response.ok) return json({ error: result?.error?.message ?? "Meta recusou o envio" }, 502);

    await admin.from("whatsapp_messages").insert({ conversation_id, direction: "outbound", message_type: "text", body: String(text).trim(), sent_by: userData.user.id, wa_message_id: result?.messages?.[0]?.id ?? null });
    await admin.from("whatsapp_conversations").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: "em_atendimento", assigned_to: userData.user.id }).eq("id", conversation_id);
    return json({ ok: true, result });
  } catch (error) {
    console.error(error);
    return json({ error: "Falha ao enviar mensagem" }, 500);
  }
});
