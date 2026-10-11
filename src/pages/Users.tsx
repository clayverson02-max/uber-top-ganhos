import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loading, PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [p, r] = await Promise.all([supabase.from("profiles").select("*").order("created_at"), supabase.from("user_roles").select("*")]);
      return (p.data ?? []).map((x) => ({ ...x, role: r.data?.find((y) => y.user_id === x.id)?.role ?? null }));
    },
  });
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "equipe" });
  const [busy, setBusy] = useState(false);
  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data: res, error } = await supabase.functions.invoke("admin-users", { body });
    setBusy(false);
    if (error || res?.error) { toast.error(res?.error ?? "Erro na operação"); return false; }
    qc.invalidateQueries({ queryKey: ["users-admin"] }); qc.invalidateQueries({ queryKey: ["profiles"] });
    return true;
  };

  return (
    <div>
      <PageHeader title="Usuários" subtitle="Crie, edite e desative acessos da equipe" />
      <form className="mb-6 grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-5" onSubmit={async (e) => {
        e.preventDefault();
        if (await call({ action: "create", ...f })) { toast.success("Usuário criado"); setF({ full_name: "", email: "", password: "", role: "equipe" }); }
      }}>
        <div className="space-y-1"><Label>Nome</Label><Input value={f.full_name} maxLength={120} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1"><Label>Senha inicial</Label><Input type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="space-y-1"><Label>Perfil</Label>
          <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="equipe">Equipe de rua</SelectItem><SelectItem value="interno">Equipe interna</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div>
        <Button type="submit" className="self-end" disabled={busy}>Criar usuário</Button>
      </form>
      {isLoading ? <Loading /> : (
        <div className="space-y-2">
          {data!.map((u) => (
            <div key={u.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold">{u.full_name || "—"} {u.id === user?.id && <span className="text-xs text-muted-foreground">(você)</span>}</p><p className="text-sm text-muted-foreground">{u.email} · {u.active ? "Ativo" : "Desativado"}</p></div>
              {u.id !== user?.id && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { const n = prompt("Novo nome", u.full_name); if (n) call({ action: "update", user_id: u.id, full_name: n }); }}>Editar nome</Button>
                  <Select value={u.role ?? ""} onValueChange={(v) => call({ action: "set_role", user_id: u.id, role: v })}><SelectTrigger className="h-9 w-40"><SelectValue placeholder="Sem perfil" /></SelectTrigger>
                    <SelectContent><SelectItem value="equipe">Equipe de rua</SelectItem><SelectItem value="interno">Equipe interna</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select>
                  <Button size="sm" variant={u.active ? "destructive" : "secondary"} onClick={() => call({ action: "set_active", user_id: u.id, active: !u.active })}>{u.active ? "Desativar" : "Reativar"}</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
