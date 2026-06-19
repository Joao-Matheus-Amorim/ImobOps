import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, APP_TAGLINE, isSupabaseConfigured } from "@/lib/constants";
import { routes } from "@/lib/routes";

export const metadata = { title: "Entrar" };

// Login screen. In mock mode any credentials proceed straight to the dashboard.
export default function LoginPage() {
  const mock = !isSupabaseConfigured();
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{APP_TAGLINE}</p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="voce@imobiliaria.com" defaultValue="admin@imobops.demo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••••" defaultValue="demo" />
            </div>
            <Button asChild className="w-full" size="lg">
              <Link href={routes.dashboard}>Entrar</Link>
            </Button>
            {mock ? (
              <p className="text-center text-xs text-muted-foreground">
                Modo demonstração — sem Supabase configurado. Qualquer credencial entra.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
