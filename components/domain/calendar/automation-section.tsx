"use client";

import { Clock3, PlayCircle, Settings2 } from "lucide-react";
import type { AutomationRule } from "@/lib/types/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { datePart, timePart } from "./utils";
import { actionOptions } from "./constants";

export function AutomationSection({
  automations,
  feedback,
  isPending,
  onToggle,
  onTest,
  onNew,
}: {
  automations: AutomationRule[];
  feedback: string | null;
  isPending: boolean;
  onToggle: (rule: AutomationRule) => void;
  onTest: (rule: AutomationRule) => void;
  onNew: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="section-label text-primary/80">Automações automáticas</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Execuções rodam como system/admin no fuso America/Sao_Paulo, sem ações de exclusão.
          </p>
        </div>
        <Button onClick={onNew}>
          <Settings2 /> Configurar automação
        </Button>
      </div>
      {feedback ? (
        <p className="mt-4 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
          {feedback}
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {automations.length ? automations.slice(0, 9).map((rule) => {
          const selectedAction = actionOptions.find((option) => option.value === rule.action.kind) ?? actionOptions[0]!;
          return (
            <div key={rule.id} className="rounded-2xl border border-primary/12 bg-background/18 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{rule.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rule.nextRunAt ? `${datePart(rule.nextRunAt).split("-").reverse().join("/")} ${timePart(rule.nextRunAt)}` : "Sem próxima execução"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${rule.status === "active" ? "bg-emerald-500/18 text-emerald-200" : "bg-muted text-muted-foreground"}`}>
                  {rule.status === "active" ? "Ativa" : "Pausada"}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {rule.description || selectedAction.label} · {rule.trigger.kind}
              </p>
              <div className="mt-4 flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onToggle(rule)} disabled={isPending}>
                  <Clock3 className="size-3.5" /> {rule.status === "active" ? "Pausar" : "Ativar"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onTest(rule)} disabled={isPending}>
                  <PlayCircle className="size-3.5" /> Testar
                </Button>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-2xl border border-dashed border-primary/18 bg-background/14 p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Nenhuma automação cadastrada. Crie uma regra para executar tarefas no horário, por recorrência ou por vencimento.
          </div>
        )}
      </div>
    </Card>
  );
}
