import { Building2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex w-full max-w-md flex-col items-center rounded-[28px] border border-primary/18 bg-[#102f4d]/78 px-8 py-10 text-center shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/18" />
          <div className="relative grid size-16 place-items-center rounded-2xl border border-primary/35 bg-primary/12 text-primary shadow-glow">
            <Building2 className="size-7 animate-pulse" />
          </div>
        </div>
        <p className="mt-6 font-display text-lg font-semibold uppercase tracking-wide text-foreground">
          Carregando modulo
        </p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Preparando a operacao para voce navegar entre clientes, imoveis e financeiro.
        </p>
      </div>
    </div>
  );
}
