import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/crm";

type Role = "admin" | "interno" | null;
type Ctx = { user: User | null; profile: Profile | null; role: Role; loading: boolean; isAdmin: boolean; isInternal: boolean; signOut: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, profile: null, role: null, loading: true, isAdmin: false, isInternal: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (!u) { setProfile(null); setRole(null); setLoading(false); return; }
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.id),
      ]);
      setProfile(p ?? null);
      const roles = (r ?? []).map((x) => x.role);
      setRole(roles.includes("admin") ? "admin" : roles.includes("interno") ? "interno" : null);
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user ?? null), 0);
    });
    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider value={{ user, profile, role, loading, isAdmin: role === "admin" && !!profile?.active, isInternal: role === "interno" && !!profile?.active,
      signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);
