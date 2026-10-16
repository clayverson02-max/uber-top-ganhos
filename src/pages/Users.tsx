import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loading, PageHeader } from "@/components/crm/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type UserRow = {
  id: string;
  full_name: string;
  display_name?: string | null;
  email: string;
  active: boolean;
  role: string | null;
  monthly_goal: number;
};

type LeadRow = { consultant_name: string | null };

const normalizeName = (value: string | null | undefined) =>
  (value ?? "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");

export default function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [f, setF] = useState({ full_name: "", display_name: "", email: "", password: "", monthly_goal: "0" });
  const [drafts, setDrafts] = useState<Record<string, { display_name: string; monthly_goal: string }>>({});
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["users-admin", month],
    queryFn: async () => {
      const start = new Date(`${month}-01T00:00:00`).toISOString();
      const endDate = new Date(`${month}-01T00:00:00`);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      const end = endDate.toISOString();
      const [p, r, g, leads] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("*"),
        (supabase as any).from("employee_goals").select("*"),
        (supabase as any).from("public_registration_leads").select("consultant_name").is("deleted_at", null).gte("created_at", start).lt("created_at", end).limit(5000),
      ]);
      const users = (p.data ?? []).map((x) => ({
        ...x,
        role: r.data?.find((y) => y.user_id === x.id)?.role ?? null,
        monthly_goal: Number(g.data?.find((y: any) => y.user_id === x.id)?.monthly_goal ?? 0),
      })) as UserRow[];
      return { users, leads: (leads.data ?? []) as LeadRow[] };
    },
  });

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    (data?.users ?? []).forEach((employee) => {
      const names = [employee.display_name, employee.full_name, employee.email].map(normalizeName).filter(Boolean);
      result[employee.id] = (data?.leads ?? []).filter((lead) => names.includes(normalizeName(lead.consultant_name))).length;
    });
    return result;
  }, [data]);

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

  const draftFor = (u: UserRow) =>
    drafts[u.id] ?? { display_name: u.display_name || u.full_name || "", monthly_goal: String(u.monthly_goal || 0) };

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
    <div className="space-y-6">
      <PageHeader title="Funcionários e acessos" subtitle="Gerencie os acessos home da equipe interna e acompanhe as metas de indicação." />

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-extrabold">Acesso home</p>
        <p className="mt-1">Os funcionários internos entram pela plataforma para acompanhar clientes e captações. O antigo acesso de equipe de rua não é mais utilizado.</p>
      </div>

      <form className="grid gap-3 rounded-xl border bg-card p-5 sm:grid-cols-5" onSubmit={async (e) => {
        e.preventDefault();
        const res = await call({ action: "create", full_name: f.full_name, display_name: f.display_name, email: f.email, password: f.password, role: "interno", monthly_goal: f.monthly_goal });
        if (res?.ok) {
          toast.success("Funcionário criado com acesso home");
          setF({ full_name: "", display_name: "", email: "", password: "", monthly_goal: "0" });
        }
      }}>
        <div className="space-y-1"><Label>Nome completo</Label><Input required value={f.full_name} maxLength={120} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1"><Label>Nome para identificação</Label><Input value={f.display_name} maxLength={120} placeholder="Ex.: Edenilson" onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
        <div className="space-y-1"><Label>E-mail</Label><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div className="space-y-1"><Label>Senha inicial</Label><Input required type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="space-y-1"><Label>Meta mensal</Label><Input inputMode="numeric" type="number" min="0" value={f.monthly_goal} onChange={(e) => setF({ ...f, monthly_goal: e.target.value })} /></div>
        <Button type="submit" className="sm:col-span-5" disabled={busy}>Cadastrar funcionário home</Button>
      </form>

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-bold">Indicações por funcionário</p><p className="text-sm text-muted-foreground">A contagem considera o nome digitado no cadastro público.</p></div>
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full sm:w-48" />
      </div>

      {isLoading ? <Loading /> : (
        <div className="space-y-3">
          {(data?.users ?? []).map((u) => {
            const draft = draftFor(u);
            return <div key={u.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="grid flex-1 gap-3 sm:grid-cols-4">
                  <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Funcionário</p><p className="font-semibold">{u.display_name || u.full_name || "—"} {u.id === user?.id && <span className="text-xs text-muted-foreground">(você)</span>}</p><p className="text-xs text-muted-foreground">{u.email} · {u.active ? "Ativo" : "Desativado"} · {u.role === "interno" ? "Acesso home" : u.role === "admin" ? "Administrador" : "Sem acesso"}</p></div>
                  <div><Label className="text-xs">Nome usado na captação</Label><Input value={draft.display_name} disabled={u.id === user?.id} onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: { ...draft, display_name: e.target.value } }))} /></div>
                  <div><Label className="text-xs">Meta mensal</Label><Input type="number" min="0" value={draft.monthly_goal} disabled={u.id === user?.id} onChange={(e) => setDrafts((d) => ({ ...d, [u.id]: { ...draft, monthly_goal: e.target.value } }))} /></div>
                  <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Indicações em {month.split("-").reverse().join("/")}</p><p className="mt-1 text-2xl font-extrabold">{counts[u.id] ?? 0}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.id !== user?.id && <Button size="sm" onClick={() => saveDetails(u)}>Salvar dados</Button>}
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
