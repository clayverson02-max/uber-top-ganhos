import { useState } from "react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ADMIN_EMAIL = (import.meta.env.VITE_COMPANY_LOGIN_EMAIL || "clayverson02@gmail.com").trim().toLowerCase();
const STAFF_EMAIL = (import.meta.env.VITE_COMPANY_STAFF_EMAIL || "clayverson06@gmail.com").trim().toLowerCase();
const INTERNAL_EMAIL = (import.meta.env.VITE_COMPANY_INTERNAL_EMAIL || "advanceofseals01@gmail.com").trim().toLowerCase();
const ALLOWED_EMAILS = new Set([ADMIN_EMAIL, STAFF_EMAIL, INTERNAL_EMAIL]);
const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha com no mínimo 8 caracteres").max(72),
});

type Mode = "login" | "forgot";

export default function Login() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const validateCompanyEmail = (value: string) => {
    if (!ALLOWED_EMAILS.has(value.trim().toLowerCase())) {
      setError("Use um e-mail autorizado da Conta Amiga.");
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedEmail = z.string().trim().email("Informe um e-mail válido").safeParse(email);
    if (!parsedEmail.success) return setError(parsedEmail.error.issues[0].message);
    if (!validateCompanyEmail(parsedEmail.data)) return;

    if (mode === "forgot") {
      setBusy(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
        redirectTo: window.location.origin + "/reset-password",
      });
      setBusy(false);
      if (resetError) return setError(resetError.message);
      toast.success("Se o acesso existir, o link de recuperação foi enviado ao e-mail da empresa.");
      setMode("login");
      return;
    }

    const parsed = schema.safeParse({ email: parsedEmail.data, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setBusy(true);
    const { error: loginError } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);

    if (loginError) {
      const message = loginError.message.toLowerCase();
      if (message.includes("invalid")) setError("E-mail ou senha incorretos.");
      else if (message.includes("banned")) setError("Este acesso está desativado.");
      else setError(loginError.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-7 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Zap className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-extrabold">Conta Amiga</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "forgot" ? "Recuperar acesso da empresa" : "Login único da empresa"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail autorizado</Label>
            <Input
              id="email"
              name="login-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode === "login" && (
            <div className="space-y-1.5">
              <Label htmlFor="pw">Senha</Label>
              <Input
                id="pw"
                name="login-password"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "forgot" ? "Enviar link de recuperação" : "Entrar"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <button
              className="text-primary hover:underline"
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
            >
              Esqueci minha senha
            </button>
          ) : (
            <button
              className="text-primary hover:underline"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Voltar ao login
            </button>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          O cadastro de novos acessos fica restrito ao administrador dentro da plataforma.
        </p>
      </div>
    </div>
  );
}
