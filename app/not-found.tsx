import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Página não encontrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            O conteúdo solicitado não existe ou você não tem acesso a ele.
          </p>
          <Button asChild>
            <Link href={routes.dashboard}>Voltar para o início</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
