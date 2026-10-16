import { NavLink, Navigate, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, UserPlus, UserRoundSearch, UserRound, Megaphone, Wallet, ShieldCheck, Trash2, LogOut, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "./States";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { user, role, profile, loading, isAdmin, isInternal, signOut } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!role || !profile?.active)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-semibold">Seu acesso ainda não foi liberado ou está desativado.</p>
        <p className="text-sm text-muted-foreground">Fale com o administrador da Conta Amiga.</p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    );

  const items = isAdmin
    ? [
        { to: "/", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/clientes", icon: Users, label: "Clientes" },
        { to: "/captacoes", icon: UserRoundSearch, label: "Captações" },
        { to: "/consultores", icon: UserRound, label: "Influencers" },
        { to: "/novo", icon: UserPlus, label: "Cadastrar" },
        { to: "/remarketing", icon: Megaphone, label: "Remarketing" },
        { to: "/financeiro", icon: Wallet, label: "Financeiro" },
        { to: "/lixeira", icon: Trash2, label: "Lixeira" },
        { to: "/usuarios", icon: ShieldCheck, label: "Usuários" },
      ]
    : isInternal
      ? [
          { to: "/clientes", icon: Users, label: "Clientes" },
          { to: "/captacoes", icon: UserRoundSearch, label: "Captações" },
          { to: "/novo", icon: UserPlus, label: "Cadastrar cliente" },
        ]
      : [{ to: "/novo", icon: UserPlus, label: "Cadastrar cliente" }];

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-brand p-4 text-primary-foreground md:flex md:sticky md:top-0 md:h-screen">
        <div className="mb-8 flex items-center gap-2 px-2 text-lg font-extrabold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Zap className="h-5 w-5" /></span>
          Conta Amiga
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) =>
              cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary-foreground/10", isActive && "bg-primary-foreground/15")}>
              <i.icon className="h-4 w-4" />{i.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-primary-foreground/20 pt-3 text-sm">
          <p className="truncate font-semibold">{profile.full_name || profile.email}</p>
          <p className="text-xs opacity-80">{isAdmin ? "Administrador" : isInternal ? "Acesso home" : "Sem acesso"}</p>
          <button onClick={signOut} className="mt-2 flex items-center gap-2 text-xs opacity-90 hover:opacity-100"><LogOut className="h-3.5 w-3.5" />Sair</button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand px-4 py-3 text-primary-foreground md:hidden">
        <div className="flex items-center gap-2 font-extrabold"><Zap className="h-5 w-5 text-accent" />Conta Amiga</div>
        <button onClick={signOut} aria-label="Sair"><LogOut className="h-5 w-5" /></button>
      </header>

      <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8"><div className="mx-auto max-w-7xl"><Outlet /></div></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card md:hidden">
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.to === "/"} className={({ isActive }) =>
            cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground", isActive && "text-primary")}>
            <i.icon className="h-5 w-5" />{i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AdminOnly({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/novo" replace />;
}

export function ClientsAccess({ children }: { children: JSX.Element }) {
  const { isAdmin, isInternal } = useAuth();
  return isAdmin || isInternal ? children : <Navigate to="/novo" replace />;
}

export function MemberAccess({ children }: { children: JSX.Element }) {
  const { role } = useAuth();
  return role ? children : <Navigate to="/login" replace />;
}
