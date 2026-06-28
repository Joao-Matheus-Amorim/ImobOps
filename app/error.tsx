"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Algo saiu do fluxo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Não conseguimos carregar esta tela agora. Tente novamente; se persistir,
            verifique o terminal do servidor.
          </p>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">Código: {error.digest}</p>
          ) : null}
          <Button type="button" onClick={reset}>Tentar novamente</Button>
        </CardContent>
      </Card>
    </main>
  );
}
