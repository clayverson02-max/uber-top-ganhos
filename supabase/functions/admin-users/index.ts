import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Não autenticado" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json();
    if (body.action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const full_name = String(body.full_name ?? "").trim().slice(0, 120);
      const role = body.role === "admin" ? "admin" : "equipe";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 8 || full_name.length < 2)
        return json({ error: "Dados inválidos (senha mínima de 8 caracteres)" }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from("user_roles").insert({ user_id: data.user.id, role });
      return json({ ok: true });
    }
    if (body.action === "set_active") {
      const id = String(body.user_id);
      if (id === u.user.id) return json({ error: "Você não pode desativar a si mesmo" }, 400);
      const active = !!body.active;
      await admin.from("profiles").update({ active }).eq("id", id);
      await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
      return json({ ok: true });
    }
    if (body.action === "set_role") {
      const id = String(body.user_id);
      if (id === u.user.id) return json({ error: "Você não pode alterar seu próprio perfil" }, 400);
      const role = body.role === "admin" ? "admin" : "equipe";
      await admin.from("user_roles").delete().eq("user_id", id);
      await admin.from("user_roles").insert({ user_id: id, role });
      return json({ ok: true });
    }
    if (body.action === "update") {
      const id = String(body.user_id);
      const full_name = String(body.full_name ?? "").trim().slice(0, 120);
      if (full_name.length < 2) return json({ error: "Nome inválido" }, 400);
      await admin.from("profiles").update({ full_name }).eq("id", id);
      return json({ ok: true });
    }
    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
