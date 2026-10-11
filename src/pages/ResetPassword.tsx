import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Mínimo de 8 caracteres");
    if (pw !== pw2) return setErr("As senhas não conferem");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setErr(error.message);
    toast.success("Senha alterada com sucesso");
    nav("/");
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-7 shadow-2xl">
        <h1 className="text-xl font-extrabold">Definir nova senha</h1>
        <div className="space-y-1.5"><Label>Nova senha</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Confirmar senha</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </div>
  );
}
