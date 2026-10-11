import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const schema = z.object({ email: z.string().trim().email("E-mail inválido").max(255), password: z.string().min(8, "Senha com no mínimo 8 caracteres").max(72) });

export default function Login() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "forgot" | "setup">("login");
  const [hasAdmin, setHasAdmin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.rpc("admin_exists").then(({ data }) => setHasAdmin(data !== false)); }, []);
  if (!loading && user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (mode === "forgot") {
      const r = z.string().trim().email().safeParse(email);
      if (!r.success) return setError("Informe um e-mail válido");
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(r.data, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      if (error) return setError(error.message);
      toast.success("Se o e-mail existir, você receberá um link de recuperação.");
      return setMode("login");
    }
    const r = schema.safeParse({ email, password });
    if (!r.success) return setError(r.error.issues[0].message);
    setBusy(true);
    if (mode === "setup") {
      if (name.trim().length < 2) { setBusy(false); return setError("Informe seu nome"); }
      const { error } = await supabase.auth.signUp({ email: r.data.email, password: r.data.password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } } });
      setBusy(false);
      if (error) return setError(error.message);
      toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.");
      return setMode("login");
    }
    const { error } = await supabase.auth.signInWithPassword(r.data);
    setBusy(false);
    if (error) setError(error.message.includes("Invalid") ? "E-mail ou senha incorretos" : error.message.includes("banned") ? "Usuário desativado" : error.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-7 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Zap className="h-7 w-7" /></span>
          <h1 className="text-2xl font-extrabold">Conta Amiga</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "forgot" ? "Recuperar senha" : mode === "setup" ? "Criar o primeiro administrador" : "Acesso interno da equipe"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "setup" && <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>}
          <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {mode !== "forgot" && <div className="space-y-1.5"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "forgot" ? "Enviar link" : mode === "setup" ? "Criar administrador" : "Entrar"}
          </Button>
        </form>
        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          {mode === "login" ? (
            <button className="text-primary hover:underline" onClick={() => { setMode("forgot"); setError(""); }}>Esqueci minha senha</button>
          ) : (
            <button className="text-primary hover:underline" onClick={() => { setMode("login"); setError(""); }}>Voltar ao login</button>
          )}
          {!hasAdmin && mode === "login" && (
            <button className="text-muted-foreground hover:underline" onClick={() => setMode("setup")}>Primeiro acesso? Criar administrador</button>
          )}
        </div>
      </div>
    </div>
  );
}
