"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { routes } from "@/lib/routes";

// Set a new password after following the recovery link from Supabase Auth
// (it signs the user into a temporary recovery session before this loads).
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase não configurado.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError("Não foi possível atualizar a senha. Solicite um novo link de recuperação.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push(routes.login);
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Senha atualizada. Redirecionando para o login…
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input
          id="confirm"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Salvar nova senha
      </Button>
    </form>
  );
}
