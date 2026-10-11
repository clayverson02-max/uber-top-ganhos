import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const validRole = (value: unknown) => {
  const role = String(value ?? "");
  return role === "interno" || role === "equipe" ? role : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRoleKey) return json({ error: "Configuração segura ausente" }, 500);

    const admin = createClient(url, serviceRoleKey);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\\s+/i, "");
    const { data: authData } = await admin.auth.getUser(token);
    if (!authData.user) return json({ error: "Não autenticado" }, 401);

    const { data: isAdmin, error: roleCheckError } = await admin.rpc("has_role", {
      _user_id: authData.user.id,
      _role: "admin",
    });
    if (roleCheckError || !isAdmin) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const fullName = String(body.full_name ?? "").trim().slice(0, 120);
      const role = validRole(body.role) ?? "equipe";

      if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email) || password.length < 8 || fullName.length < 2) {
        return json({ error: "Dados inválidos (senha mínima de 8 caracteres)" }, 400);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user) return json({ error: createError?.message ?? "Não foi possível criar o usuário" }, 400);

      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").update({ full_name: fullName, active: true }).eq("id", userId);
      const { error: deleteRoleError } = await admin.from("user_roles").delete().eq("user_id", userId);
      const { error: insertRoleError } = await admin.from("user_roles").insert({ user_id: userId, role });

      if (profileError || deleteRoleError || insertRoleError) {
        await admin.auth.admin.deleteUser(userId);
        return json({ error: "Usuário criado, mas não foi possível configurar o perfil" }, 500);
      }
      return json({ ok: true });
    }

    if (action === "set_role") {
      const id = String(body.user_id ?? "");
      const role = validRole(body.role);
      if (!id || !role) return json({ error: "Perfil inválido" }, 400);
      if (id === authData.user.id) return json({ error: "Você não pode alterar seu próprio perfil" }, 400);

      const { error: deleteError } = await admin.from("user_roles").delete().eq("user_id", id);
      if (deleteError) return json({ error: deleteError.message }, 500);
      const { error: insertError } = await admin.from("user_roles").insert({ user_id: id, role });
      if (insertError) return json({ error: insertError.message }, 500);
      return json({ ok: true });
    }

    if (action === "set_active") {
      const id = String(body.user_id ?? "");
      if (!id) return json({ error: "Usuário inválido" }, 400);
      if (id === authData.user.id) return json({ error: "Você não pode desativar a si mesmo" }, 400);

      const active = !!body.active;
      const { error: profileError } = await admin.from("profiles").update({ active }).eq("id", id);
      if (profileError) return json({ error: profileError.message }, 500);

      const { error: authError } = await admin.auth.admin.updateUserById(id, {
        ban_duration: active ? "none" : "876000h",
      });
      if (authError) return json({ error: authError.message }, 500);
      return json({ ok: true });
    }

    if (action === "update") {
      const id = String(body.user_id ?? "");
      const fullName = String(body.full_name ?? "").trim().slice(0, 120);
      if (!id || fullName.length < 2) return json({ error: "Nome inválido" }, 400);

      const { error } = await admin.from("profiles").update({ full_name: fullName }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
});
