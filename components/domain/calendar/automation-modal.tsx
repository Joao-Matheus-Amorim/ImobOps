"use client";

import { useState } from "react";
import { Clock3, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { AutomationActionKind, AutomationTriggerKind } from "@/lib/types/domain";
import { actionOptions, triggerOptions, weekdays } from "./constants";
import { fieldLabel, minutesFromTime, timeFromMinutes, clientDetail, todayDatePart } from "./utils";
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
  const filteredClients = initialClients.filter((client) => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return true;
    return [client.name, client.phone ?? "", client.whatsapp ?? ""].join(" ").toLowerCase().includes(term);
  });
  const filteredProperties = initialProperties.filter((property) => {
    const term = propertySearch.trim().toLowerCase();
    if (!term) return true;
    return [property.address, property.status].join(" ").toLowerCase().includes(term);
  });

  function parsedPayload(): Record<string, unknown> {
    try {
      const value = JSON.parse(payloadText || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  function updatePayloadField(key: string, value: string) {
    const current = parsedPayload();
    const original = current[key];
    let next: unknown = value;
    if (typeof original === "number") next = Number(value || 0);
    if (Array.isArray(original)) next = value.split(",").map((item) => item.trim()).filter(Boolean);
    if (value === "" && (original === null || key.endsWith("Id") || key === "signedAt" || key === "paymentTerms")) next = null;
    setPayloadText(JSON.stringify({ ...current, [key]: next }, null, 2));
  }

  function renderPayloadField(key: string, value: unknown) {
    const stringValue = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
    const inputType = key.toLowerCase().includes("date") || key === "signedAt" ? "date" : typeof value === "number" ? "number" : "text";
    return (
      <div key={key} className="space-y-1.5">
        <label htmlFor={`payload-${key}`} className="text-sm font-medium text-foreground">{fieldLabel(key)}</label>
        <input
          id={`payload-${key}`}
          type={inputType}
          value={stringValue}
          onChange={(event) => updatePayloadField(key, event.target.value)}
          placeholder={key.endsWith("Id") ? "Selecione ou cole o código do registro" : undefined}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    );
  }

  function renderClientPicker(key: string, label: string) {
    const payload = parsedPayload();
    const selectedId = String(payload[key] ?? "");
    const selected = initialClients.find((client) => client.id === selectedId);
    return (
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <input
          value={clientSearch}
          onChange={(event) => setClientSearch(event.target.value)}
          placeholder="Digite nome ou telefone. Ex.: João"
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="max-h-44 overflow-y-auto rounded-2xl border border-primary/12 bg-background/18 p-2">
          {filteredClients.length ? filteredClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => updatePayloadField(key, client.id)}
              className={`mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition last:mb-0 ${selectedId === client.id ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{client.name}</span>
                <span className="block truncate text-xs opacity-75">{clientDetail(client)}</span>
              </span>
              {selectedId === client.id ? <span className="text-xs font-semibold">Selecionado</span> : null}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado com esse nome/telefone.</p>
          )}
        </div>
        {selected ? <p className="text-xs text-primary">Cliente escolhido: {selected.name} - {clientDetail(selected)}</p> : <p className="text-xs text-muted-foreground">Se aparecerem 30 clientes com o mesmo nome, selecione exatamente o correto pela lista.</p>}
      </div>
    );
  }

  function renderPropertyPicker(key: string, label: string) {
    const payload = parsedPayload();
    const selectedId = String(payload[key] ?? "");
    const selected = initialProperties.find((property) => property.id === selectedId);
    return (
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <input
          value={propertySearch}
          onChange={(event) => setPropertySearch(event.target.value)}
          placeholder="Digite rua, bairro ou status do imóvel"
          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="max-h-44 overflow-y-auto rounded-2xl border border-primary/12 bg-background/18 p-2">
          {filteredProperties.length ? filteredProperties.map((property) => (
            <button
              key={property.id}
              type="button"
              onClick={() => updatePayloadField(key, property.id)}
              className={`mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition last:mb-0 ${selectedId === property.id ? "bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{property.address}</span>
                <span className="block truncate text-xs opacity-75">Status: {property.status}</span>
              </span>
              {selectedId === property.id ? <span className="text-xs font-semibold">Selecionado</span> : null}
            </button>
          )) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum imóvel encontrado.</p>
          )}
        </div>
        {selected ? <p className="text-xs text-primary">Imóvel escolhido: {selected.address}</p> : null}
      </div>
    );
  }

  function renderGuidedPayloadForm() {
    const payload = parsedPayload();

    if (actionKind === "create_client") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Nome do cliente</label>
            <input value={String(payload.name ?? "")} onChange={(event) => updatePayloadField("name", event.target.value)} placeholder="Ex.: Maria Silva (nome e sobrenome)" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Telefone obrigatório</label>
            <input value={String(payload.phone ?? "")} onChange={(event) => updatePayloadField("phone", event.target.value)} placeholder="(11) 99999-9999" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">WhatsApp</label>
            <input value={String(payload.whatsapp ?? "")} onChange={(event) => updatePayloadField("whatsapp", event.target.value)} placeholder="Se for diferente do telefone" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input value={String(payload.email ?? "")} onChange={(event) => updatePayloadField("email", event.target.value)} placeholder="cliente@email.com" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo</label>
            <select value={String(payload.kind ?? "pf")} onChange={(event) => updatePayloadField("kind", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="pf">Pessoa física</option>
              <option value="pj">Pessoa jurídica</option>
            </select>
          </div>
        </div>
      );
    }

    if (actionKind === "create_property") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Endereço do imóvel</label>
            <input value={String(payload.address ?? "")} onChange={(event) => updatePayloadField("address", event.target.value)} placeholder="Rua, número, bairro" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de imóvel</label>
            <select value={String(payload.kind ?? "apartamento")} onChange={(event) => updatePayloadField("kind", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="apartamento">Apartamento</option>
              <option value="casa">Casa</option>
              <option value="comercial">Comercial</option>
              <option value="terreno">Terreno</option>
              <option value="sala">Sala</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Disponibilidade</label>
            <select value={String(payload.availability ?? "ambos")} onChange={(event) => updatePayloadField("availability", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="locacao">Locação</option>
              <option value="venda">Venda</option>
              <option value="ambos">Locação e venda</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Quartos</label>
            <input type="number" min={0} value={String(payload.bedrooms ?? "")} onChange={(event) => updatePayloadField("bedrooms", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Vagas</label>
            <input type="number" min={0} value={String(payload.parkingSpots ?? "")} onChange={(event) => updatePayloadField("parkingSpots", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          {renderClientPicker("ownerClientId", "Proprietário do imóvel")}
        </div>
      );
    }

    if (actionKind === "create_rental_contract") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {renderPropertyPicker("propertyId", "Imóvel da locação")}
          {renderClientPicker("landlordClientId", "Proprietário")}
          {renderClientPicker("tenantClientId", "Inquilino")}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Valor mensal</label>
            <input type="number" min={0} step="0.01" value={String(payload.monthlyValue ?? "")} onChange={(event) => updatePayloadField("monthlyValue", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Dia do vencimento</label>
            <input type="number" min={1} max={28} value={String(payload.dueDay ?? "10")} onChange={(event) => updatePayloadField("dueDay", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Início</label>
            <DateTimePicker value={String(payload.startDate ?? today)} onChange={(value) => updatePayloadField("startDate", value)} mode="date" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Fim</label>
            <DateTimePicker value={String(payload.endDate ?? today)} onChange={(value) => updatePayloadField("endDate", value)} mode="date" />
          </div>
        </div>
      );
    }

    if (actionKind === "create_charge_standalone" || actionKind === "create_charge_and_send_whatsapp") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            {renderClientPicker("clientId", "Cliente que receberá o boleto")}
            {!initialClients.length ? (
              <p className="text-xs text-muted-foreground">Nenhum cliente encontrado. Crie o cliente primeiro e depois configure o boleto.</p>
            ) : null}
            {actionKind === "create_charge_and_send_whatsapp" ? (
              <p className="text-xs text-muted-foreground">O WhatsApp será enviado para o número cadastrado no cliente selecionado.</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Valor</label>
            <input type="number" min={0} step="0.01" value={String(payload.amount ?? "")} onChange={(event) => updatePayloadField("amount", event.target.value)} placeholder="Ex.: 850,00" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Vencimento</label>
            <DateTimePicker value={String(payload.dueDate ?? today)} onChange={(value) => updatePayloadField("dueDate", value)} mode="date" placeholder="Escolher vencimento" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Forma de cobrança</label>
            <select value={String(payload.method ?? "boleto")} onChange={(event) => updatePayloadField("method", event.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="boleto">Boleto</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <input value={String(payload.description ?? "")} onChange={(event) => updatePayloadField("description", event.target.value)} placeholder="Ex.: Aluguel de julho" className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
        </div>
      );
    }

    return <div className="grid gap-3 md:grid-cols-2">{Object.entries(payload).map(([key, value]) => renderPayloadField(key, value))}</div>;
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

            <div className="rounded-2xl border border-primary/16 bg-background/16 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Settings2 className="size-4 text-primary" /> O que executar
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { kind: "create_client" as const, title: "Criar cliente", text: "Nome, telefone, WhatsApp e e-mail." },
                  { kind: "create_property" as const, title: "Criar imóvel", text: "Endereço, tipo, quartos, vagas e proprietário." },
                  { kind: "create_rental_contract" as const, title: "Criar locação", text: "Escolha imóvel, proprietário, inquilino e valor." },
                  { kind: "create_charge_standalone" as const, title: "Criar boleto", text: "Escolha o cliente pelo nome e informe valor/vencimento." },
                  { kind: "create_charge_and_send_whatsapp" as const, title: "Boleto + WhatsApp", text: "Cria o boleto e envia o link ao WhatsApp do cliente." },
                ].map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => { const action = actionOptions.find((item) => item.value === option.kind)!; setActionKind(option.kind); setPayloadText(JSON.stringify(action.example, null, 2)); setTargetId(""); }}
                    className={`rounded-2xl border p-4 text-left transition ${actionKind === option.kind ? "border-primary bg-primary/12 shadow-glow-sm" : "border-primary/12 bg-background/16 hover:border-primary/35 hover:bg-primary/6"}`}
                  >
                    <p className="font-semibold text-foreground">{option.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.text}</p>
                  </button>
                ))}
              </div>
              <details className="mt-4 rounded-2xl border border-primary/12 bg-background/10 p-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition hover:text-primary">
                  Outras ações do sistema
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="action-kind" className="text-sm font-medium text-foreground">Escolha uma ação avançada</label>
                    <select id="action-kind" value={actionKind} onChange={(event) => { const value = event.target.value as AutomationActionKind; const option = actionOptions.find((item) => item.value === value) ?? actionOptions[0]!; setActionKind(value); setPayloadText(JSON.stringify(option.example, null, 2)); setTargetId(""); }} className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.group} - {option.label}</option>)}
                    </select>
                  </div>
                  {selectedAction.target ? (
                    <div className="space-y-1.5">
                      <label htmlFor="target-id" className="text-sm font-medium text-foreground">Registro que será alterado (obrigatório)</label>
                      <input id="target-id" value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="Cole o código do cliente, cobrança, lead..." className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                      <p className="text-xs text-muted-foreground">Só use este campo quando a ação for editar, baixar ou ratear algo existente.</p>
                    </div>
                  ) : null}
                </div>
              </details>
              <div className="mt-4 rounded-2xl border border-primary/12 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Dados da ação</p>
                    <p className="mt-1 text-xs text-muted-foreground">Preencha como um formulário. A configuração técnica fica escondida em avançado.</p>
                  </div>
                  <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{selectedAction.group}</span>
                </div>
                <div className="mt-4">{renderGuidedPayloadForm()}</div>
                <details className="mt-4 rounded-xl border border-primary/12 bg-background/35 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition hover:text-primary">Configuração avançada</summary>
                  <p className="mt-2 text-xs text-muted-foreground">Use apenas se precisar ajustar campos que ainda não aparecem no formulário.</p>
                  <textarea id="payload-json" value={payloadText} onChange={(event) => setPayloadText(event.target.value)} spellCheck={false} rows={8} className="mt-3 w-full rounded-xl border border-input bg-background p-4 font-mono text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring" />
                </details>
              </div>
            </div>
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
