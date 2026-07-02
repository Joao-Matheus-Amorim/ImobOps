"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { routes } from "@/lib/routes";

// Real login form. With Supabase configured it signs in with email/password; in
// mock mode (no client) it just proceeds to the dashboard.
export function LoginForm({ mock }: { mock: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      // Mock mode: no auth, go straight in.
      console.log("Login em modo mock");
      router.push(routes.dashboard);
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      console.error("Login error:", error);
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push(routes.dashboard);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="voce@imobiliaria.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Entrar
      </Button>
      {mock ? null : null}
    </form>
  );
}
