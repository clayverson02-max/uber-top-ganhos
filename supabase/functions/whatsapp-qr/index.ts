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

    const base = (Deno.env.get("EVOLUTION_API_URL") ?? "").replace(/\/$/, "");
    const apiKey = Deno.env.get("EVOLUTION_API_KEY");
    const instance = Deno.env.get("EVOLUTION_INSTANCE_NAME") ?? "conta-amiga";
    if (!base || !apiKey) return json({ error: "Evolution API ainda não configurada no Supabase" }, 503);

    const { action = "connect" } = await req.json().catch(() => ({}));
    const webhook = `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`;
    let response: Response;
    if (action === "status") {
      response = await fetch(`${base}/instance/connectionState/${encodeURIComponent(instance)}`, { headers: { apikey: apiKey } });
    } else if (action === "qr") {
      response = await fetch(`${base}/instance/connect/${encodeURIComponent(instance)}`, { headers: { apikey: apiKey } });
    } else {
      response = await fetch(`${base}/instance/create`, { method: "POST", headers: { apikey: apiKey, "Content-Type": "application/json" }, body: JSON.stringify({ instanceName: instance, token: apiKey, qrcode: true, webhook, webhookByEvents: false, events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"] }) });
    }
    const result = await response.json();
    return json(result, response.status);
  } catch (error) {
    console.error(error);
    return json({ error: "Falha ao comunicar com a Evolution API" }, 500);
  }
});
