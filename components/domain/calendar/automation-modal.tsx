"use client";

import { useState } from "react";
import { Clock3, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { AutomationActionKind, AutomationTriggerKind } from "@/lib/types/domain";
import { actionOptions, triggerOptions, weekdays } from "./constants";
import { minutesFromTime, timeFromMinutes, todayDatePart } from "./utils";
import { AutomationModalActionSection } from "./automation-modal-action-section";
import type { AutomationClientOption, AutomationPropertyOption } from "./types";

export type AutomationFormData = {
  name: string;
  description: string;
  trigger: {
    kind: AutomationTriggerKind;
    localDate: string | null;
    localTime: string;
    weekDays?: number[];
    monthDays?: number[];
    intervalDays?: number;
    chargeOffsetDays?: number;
  };
  action: {
    kind: AutomationActionKind;
    targetId: string | null;
    payload: Record<string, unknown>;
  };
};

export function AutomationModal({
  open,
  error,
  isPending,
  initialClients,
  initialProperties,
  onClose,
  onSubmit,
}: {
  open: boolean;
  error: string | null;
  isPending: boolean;
  initialClients: AutomationClientOption[];
  initialProperties: AutomationPropertyOption[];
  onClose: () => void;
  onSubmit: (data: AutomationFormData) => void;
}) {
  const today = todayDatePart();
  const [automationName, setAutomationName] = useState("");
  const [automationDescription, setAutomationDescription] = useState("");
  const [triggerKind, setTriggerKind] = useState<AutomationTriggerKind>("once");
  const [automationDate, setAutomationDate] = useState(today);
  const [automationTime, setAutomationTime] = useState("09:00");
  const [weekDaysState, setWeekDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthDays, setMonthDays] = useState("1");
  const [intervalDays, setIntervalDays] = useState("3");
  const [chargeOffsetDays, setChargeOffsetDays] = useState("0");
  const [actionKind, setActionKind] = useState<AutomationActionKind>("create_client");
  const [targetId, setTargetId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [payloadText, setPayloadText] = useState(JSON.stringify(actionOptions[0]!.example, null, 2));

  const selectedAction = actionOptions.find((option) => option.value === actionKind) ?? actionOptions[0]!;
  const selectedTrigger = triggerOptions.find((option) => option.value === triggerKind) ?? triggerOptions[0]!;
  const automationDateTime = `${automationDate}T${automationTime}`;
  const automationMinutes = minutesFromTime(automationTime);

  function parsedPayload(): Record<string, unknown> {
    try {
      const value = JSON.parse(payloadText || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  function handleSubmit() {
    const payload = parsedPayload();
    const trigger = {
      kind: triggerKind,
      localDate: triggerKind === "once" || triggerKind === "interval_days" ? automationDate : null,
      localTime: automationTime,
      weekDays: triggerKind === "weekly" ? weekDaysState : undefined,
      monthDays: triggerKind === "monthly" ? monthDays.split(",").map((day) => Number(day.trim())).filter(Boolean) : undefined,
      intervalDays: triggerKind === "interval_days" ? Number(intervalDays) : undefined,
      chargeOffsetDays: triggerKind === "charge_due" ? Number(chargeOffsetDays) : undefined,
    };
    onSubmit({
      name: automationName.trim(),
      description: automationDescription.trim() || "",
      trigger,
      action: {
        kind: actionKind,
        targetId: targetId.trim() || null,
        payload,
      },
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="section-label text-primary/80">Automação automática</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Configurar tarefa inteligente</h2>
            <p className="mt-1 text-sm text-muted-foreground">Escolha quando a tarefa roda e o que o sistema deve fazer por você.</p>
          </div>
          <button
            type="button"
            aria-label="Fechar automação"
            title="Fechar automação"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="automation-name" className="text-sm font-medium text-foreground">Nome</label>
                <input id="automation-name" value={automationName} onChange={(event) => setAutomationName(event.target.value)} placeholder="Ex.: Gerar boleto mensal" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="automation-description" className="text-sm font-medium text-foreground">Descrição</label>
                <input id="automation-description" value={automationDescription} onChange={(event) => setAutomationDescription(event.target.value)} placeholder="Opcional" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/16 bg-background/16 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock3 className="size-4 text-primary" /> Quando disparar
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="trigger-kind" className="text-sm font-medium text-foreground">Recorrência</label>
                  <select id="trigger-kind" value={triggerKind} onChange={(event) => setTriggerKind(event.target.value as AutomationTriggerKind)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {triggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">{selectedTrigger.hint}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {triggerKind === "once" || triggerKind === "interval_days" ? (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Data inicial</label>
                    <DateTimePicker value={automationDateTime} onChange={(value) => { const [date, time] = value.split("T"); if (date) setAutomationDate(date); if (time) setAutomationTime(time); }} mode="datetime" placeholder="Abrir calendário e escolher data/hora" />
                  </div>
                ) : null}
                <div className="space-y-3 md:col-span-2 rounded-2xl border border-primary/12 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Horário de execução</p>
                      <p className="text-xs text-muted-foreground">Arraste para ajustar em passos de 15 minutos.</p>
                    </div>
                    <div className="rounded-2xl border border-primary/25 bg-primary/12 px-4 py-2 font-display text-2xl font-bold text-primary text-glow">{automationTime}</div>
                  </div>
                  <input aria-label="Horário de execução" type="range" min={0} max={1425} step={15} value={automationMinutes} onChange={(event) => setAutomationTime(timeFromMinutes(Number(event.target.value)))} className="h-2 w-full cursor-pointer accent-primary" />
                  <div className="flex flex-wrap gap-2">
                    {["08:00", "09:00", "12:00", "14:00", "18:00"].map((time) => (
                      <button key={time} type="button" onClick={() => setAutomationTime(time)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${automationTime === time ? "bg-primary text-primary-foreground" : "bg-background/40 text-muted-foreground hover:bg-primary/10"}`}>{time}</button>
                    ))}
                  </div>
                </div>
                {triggerKind === "weekly" ? (
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm font-medium text-foreground">Dias da semana</p>
                    <div className="flex flex-wrap gap-2">
                      {weekdays.map((label, index) => (
                        <button key={label} type="button" onClick={() => setWeekDays((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort())} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${weekDaysState.includes(index) ? "bg-primary text-primary-foreground" : "bg-background/40 text-muted-foreground hover:bg-primary/10"}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {triggerKind === "monthly" ? (
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="month-days" className="text-sm font-medium text-foreground">Dias do mês</label>
                    <input id="month-days" value={monthDays} onChange={(event) => setMonthDays(event.target.value)} placeholder="Ex.: 1, 10, 20" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                ) : null}
                {triggerKind === "interval_days" ? (
                  <div className="space-y-1.5">
                    <label htmlFor="interval-days" className="text-sm font-medium text-foreground">A cada quantos dias</label>
                    <input id="interval-days" type="number" min={1} value={intervalDays} onChange={(event) => setIntervalDays(event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                ) : null}
                {triggerKind === "charge_due" ? (
                  <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor="charge-offset" className="text-sm font-medium text-foreground">Offset do vencimento</label>
                    <select id="charge-offset" value={chargeOffsetDays} onChange={(event) => setChargeOffsetDays(event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="-3">3 dias antes</option>
                      <option value="0">No vencimento</option>
                      <option value="1">1 dia depois</option>
                      <option value="3">3 dias depois</option>
                      <option value="5">5 dias depois</option>
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            <AutomationModalActionSection
              actionKind={actionKind}
              targetId={targetId}
              payloadText={payloadText}
              today={today}
              clientSearch={clientSearch}
              propertySearch={propertySearch}
              initialClients={initialClients}
              initialProperties={initialProperties}
              onActionKindChange={(kind, example) => { setActionKind(kind); setPayloadText(JSON.stringify(example, null, 2)); }}
              onTargetIdChange={setTargetId}
              onPayloadTextChange={setPayloadText}
              onClientSearchChange={setClientSearch}
              onPropertySearchChange={setPropertySearch}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/18 bg-primary/8 p-4">
              <p className="text-xs uppercase tracking-wide text-primary/80">Resumo</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{automationName.trim() || "Nova automação"}</p>
              <p className="mt-2 text-sm text-muted-foreground">Vai rodar {selectedTrigger.label.toLowerCase()} às {automationTime}, no horário de Brasília.</p>
              <p className="mt-2 text-sm text-muted-foreground">O sistema vai: {selectedAction.label.toLowerCase()}.</p>
            </div>
            <div className="rounded-2xl border border-primary/18 bg-background/16 p-4">
              <p className="text-xs uppercase tracking-wide text-primary/80">Segurança</p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>A automação nunca exclui registros.</p>
                <p>O sistema valida os dados antes de salvar.</p>
                <p>Cada execução fica registrada no histórico.</p>
                <p>Execuções duplicadas no mesmo horário são bloqueadas.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/18 bg-background/16 p-4">
              <p className="text-xs uppercase tracking-wide text-primary/80">Dica</p>
              <p className="mt-3 text-sm text-muted-foreground">Para ações de criação, preencha os dados normalmente. Para edição, cole o código do registro que deve ser alterado.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-primary/12 pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            <Settings2 className="size-4" />
            {isPending ? "Salvando..." : "Salvar automação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
