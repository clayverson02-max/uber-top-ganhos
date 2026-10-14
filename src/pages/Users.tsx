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

type UserRow = {
  id: string; full_name: string; display_name?: string | null; email: string; active: boolean;
  role: string | null; monthly_goal: number;
};

export default function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["users-admin"],
    queryFn: async () => {
      const [p, r, g] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
        (supabase as any).from("employee_goals").select("*"),
      ]);
      return (p.data ?? []).map((x) => ({
        ...x,
        role: r.data?.find((y) => y.user_id === x.id)?.role ?? null,
        monthly_goal: Number(g.data?.find((y: any) => y.user_id === x.id)?.monthly_goal ?? 0),
      })) as UserRow[];
    },
  });
  const [f, setF] = useState({ full_name: "", display_name: "", email: "", password: "", role: "equipe", monthly_goal: "0" });
  const [drafts, setDrafts] = useState<Record<string, { display_name: string; monthly_goal: string }>>({});
  const [busy, setBusy] = useState(false);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data: res, error } = await supabase.functions.invoke("admin-users", { body });
    setBusy(false);
    if (error || res?.error) {
      toast.error(res?.error ?? error?.message ?? "Erro na operação");
      return null;
    }
    qc.invalidateQueries({ queryKey: ["users-admin"] });
    qc.invalidateQueries({ queryKey: ["profiles"] });
    return res;
  };

  const draftFor = (u: UserRow) => drafts[u.id] ?? { display_name: u.display_name || u.full_name || "", monthly_goal: String(u.monthly_goal || 0) };
  const saveDetails = async (u: UserRow) => {
    const draft = draftFor(u);
    const goal = Math.max(0, Number(draft.monthly_goal.replace(",", ".")) || 0);
    const { error: profileError } = await supabase.from("profiles").update({ display_name: draft.display_name.trim() || u.full_name }).eq("id", u.id);
    const { error: goalError } = await (supabase as any).from("employee_goals").upsert({ user_id: u.id, monthly_goal: goal }, { onConflict: "user_id" });
    if (profileError || goalError) return toast.error(profileError?.message ?? goalError?.message ?? "Não foi possível salvar");
    toast.success("Nome e meta atualizados");
    qc.invalidateQueries({ queryKey: ["users-admin"] });
    qc.invalidateQueries({ queryKey: ["profiles"] });
  };

  return (
    <div>
      <PageHeader title="Usuários e metas" subtitle="Crie, edite e acompanhe os funcionários da operação" />
      <form className="mb-6 grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-6" onSubmit={async (e) => {
        e.preventDefault();
        const res = await call({ action: "create", ...f });
        if (res?.ok) { toast.success("Usuário criado"); setF({ full_name: "", display_name: "", email: "", password: "", role: "equipe", monthly_goal: "0" }); }
      }}>
        <div className="space-y-1"><Label>Nome completo</Label><Input required value={f.full_name} maxLength={120} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1"><Label>Nome no painel</Label><Input value={f.display_name} maxLength={120} placeholder="Funcionário 1" onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
        <div className="space-y-1"><Label>E-mail</Label><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1"><Label>Senha inicial</Label><Input required type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="space-y-1"><Label>Perfil</Label>
          <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="equipe">Equipe de rua</SelectItem><SelectItem value="interno">Equipe interna</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label>Meta mensal</Label><Input inputMode="numeric" type="number" min="0" value={f.monthly_goal} onChange={(e) => setF({ ...f, monthly_goal: e.target.value })} /></div>
        <Button type="submit" className="sm:col-span-6" disabled={busy}>Criar funcionário</Button>
      </form>
      {isLoading ? <Loading /> : (
        <div className="space-y-3">
          {(data ?? []).map((u) => {
            const draft = draftFor(u);
            return <div key={u.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Nome real</p><p className="font-semibold">{u.full_name || "—"} {u.id === user?.id && <span className="text-xs text-muted-foreground">(você)</span>}</p><p className="text-xs text-muted-foreground">{u.email} · {u.active ? "Ativo" : "Desativado"}</p></div>
                  <div><Label className="text-xs">Nome no painel</Label><Input value={draft.display_name} disabled={u.id === user?.id} onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: { ...draft, display_name: e.target.value } }))} /></div>
                  <div><Label className="text-xs">Meta mensal</Label><Input type="number" min="0" value={draft.monthly_goal} disabled={u.id === user?.id} onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: { ...draft, monthly_goal: e.target.value } }))} /></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.id !== user?.id && <Button size="sm" onClick={() => saveDetails(u)}>Salvar dados</Button>}
                  {u.id !== user?.id && <Select value={u.role ?? ""} onValueChange={(v) => call({ action: "set_role", user_id: u.id, role: v })}><SelectTrigger className="h-9 w-40"><SelectValue placeholder="Sem perfil" /></SelectTrigger><SelectContent><SelectItem value="equipe">Equipe de rua</SelectItem><SelectItem value="interno">Equipe interna</SelectItem></SelectContent></Select>}
                  {u.id !== user?.id && <Button size="sm" variant={u.active ? "destructive" : "secondary"} onClick={() => call({ action: "set_active", user_id: u.id, active: !u.active })}>{u.active ? "Desativar" : "Reativar"}</Button>}
                </div>
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
