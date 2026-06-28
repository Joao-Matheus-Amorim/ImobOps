"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  PlayCircle,
  Plus,
  Settings2,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { UnifiedEvent } from "@/lib/repositories/calendar.repository";
import type { AutomationActionKind, AutomationRule, AutomationTriggerKind, CalendarTone } from "@/lib/types/domain";

const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

const toneStyle = {
  task: "bg-primary/25 text-foreground",
  meeting: "bg-sky-500/22 text-foreground",
  payment: "bg-primary/35 text-foreground shadow-glow-sm",
  board: "bg-indigo-400/20 text-foreground",
  visit: "bg-emerald-500/20 text-foreground",
} satisfies Record<CalendarTone, string>;

const sourceLabel: Record<UnifiedEvent["source"], string> = {
  manual: "Manual",
  visit: "Visita",
  charge: "Cobranca",
  contract: "Contrato",
  meeting: "Assembleia",
  automation: "Automacao",
};

const triggerOptions: Array<{ value: AutomationTriggerKind; label: string; hint: string }> = [
  { value: "once", label: "Uma vez", hint: "Executa em uma data e hora específicas." },
  { value: "daily", label: "Diária", hint: "Executa todos os dias no horário escolhido." },
  { value: "weekly", label: "Semanal", hint: "Executa nos dias da semana selecionados." },
  { value: "monthly", label: "Mensal", hint: "Executa em dias específicos do mês." },
  { value: "interval_days", label: "Intervalo", hint: "Executa a cada N dias." },
  { value: "charge_due", label: "Vencimento", hint: "Executa relativo ao vencimento de cobranças." },
];

const actionOptions: Array<{ value: AutomationActionKind; label: string; group: string; example: Record<string, unknown>; target?: boolean }> = [
  { value: "create_client", label: "Criar cliente", group: "Clientes", example: { kind: "pf", name: "", phone: "", whatsapp: null, email: null, document: null, address: null, rolesInBusiness: ["lead"], tags: [] } },
  { value: "update_client", label: "Editar cliente", group: "Clientes", target: true, example: { tags: ["automacao"] } },
  { value: "create_property", label: "Criar imovel", group: "Imoveis", example: { kind: "apartamento", address: "Endereco", status: "disponivel", availability: "ambos", photos: [] } },
  { value: "update_property", label: "Editar imovel", group: "Imoveis", target: true, example: { status: "disponivel" } },
  { value: "create_charge_standalone", label: "Criar boleto/PIX para cliente", group: "Financeiro", example: { clientId: "", amount: 100, dueDate: "2026-07-10", method: "boleto", description: "Cobranca avulsa" } },
  { value: "create_charge_and_send_whatsapp", label: "Criar boleto e enviar WhatsApp", group: "Financeiro", example: { clientId: "", amount: 100, dueDate: "2026-07-10", method: "boleto", description: "Cobranca avulsa" } },
  { value: "create_charge_for_installment", label: "Emitir cobranca de parcela", group: "Financeiro", example: { sourceId: "", method: "boleto" } },
  { value: "create_charge_for_condo_fee", label: "Emitir cobranca condominio", group: "Financeiro", example: { sourceId: "", method: "boleto" } },
  { value: "update_charge", label: "Editar cobranca", group: "Financeiro", target: true, example: { description: "Descricao atualizada" } },
  { value: "mark_charge_paid", label: "Marcar cobranca paga", group: "Financeiro", target: true, example: {} },
  { value: "create_crm_lead", label: "Criar lead", group: "CRM", example: { source: "outros", interest: "locacao", funnelStage: "novo" } },
  { value: "update_crm_lead", label: "Editar lead", group: "CRM", target: true, example: { funnelStage: "qualificado" } },
  { value: "create_crm_activity", label: "Criar atividade", group: "CRM", example: { leadId: "", kind: "nota", description: "Atividade automatica" } },
  { value: "schedule_visit", label: "Agendar visita", group: "CRM", example: { leadId: "", scheduledAt: "2026-07-10T14:00:00.000Z", description: "Visita agendada" } },
  { value: "create_rental_contract", label: "Criar contrato locacao", group: "Locacao", example: { propertyId: "", landlordClientId: "", tenantClientId: "", monthlyValue: 2500, dueDay: 10, startDate: "2026-07-01", endDate: "2027-07-01", durationMonths: 12, indexType: "ipca", adminFeePct: 10, lateFeePct: 2, lateInterestPctMonth: 1, status: "ativo" } },
  { value: "update_rental_contract", label: "Editar contrato locacao", group: "Locacao", target: true, example: { status: "em_renovacao" } },
  { value: "create_sale_listing", label: "Criar anuncio venda", group: "Vendas", example: { propertyId: "", askingPrice: 500000, status: "ativa", commissionPct: 6 } },
  { value: "update_sale_listing", label: "Editar anuncio venda", group: "Vendas", target: true, example: { status: "sob_proposta" } },
  { value: "create_sale_proposal", label: "Registrar proposta", group: "Vendas", example: { listingId: "", buyerClientId: "", brokerUserId: "", offeredPrice: 450000, status: "em_analise", history: [] } },
  { value: "move_sale_proposal", label: "Mover proposta", group: "Vendas", example: { proposalId: "", status: "contraproposta", note: "Movido por automacao" } },
  { value: "create_sale_contract", label: "Criar contrato venda", group: "Vendas", example: { listingId: "", buyerClientId: "", sellerClientId: "", finalPrice: 480000, status: "fechado" } },
  { value: "create_condo", label: "Criar condominio", group: "Condominio", example: { name: "Condominio", address: "Endereco", unitCount: 0, adminFeePct: 10 } },
  { value: "update_condo", label: "Editar condominio", group: "Condominio", target: true, example: { adminFeePct: 12 } },
  { value: "create_condo_unit", label: "Criar unidade", group: "Condominio", example: { condoId: "", label: "Apto 101", fractionPct: 0 } },
  { value: "generate_condo_fees", label: "Gerar taxas", group: "Condominio", example: { condoId: "", referenceMonth: "2026-07", dueDate: "2026-07-10", amount: 350 } },
  { value: "create_condo_expense", label: "Criar despesa", group: "Condominio", example: { condoId: "", referenceMonth: "2026-07", description: "Despesa", totalAmount: 1000, apportionment: "igual", status: "lancada" } },
  { value: "apportion_condo_expense", label: "Ratear despesa", group: "Condominio", target: true, example: {} },
  { value: "create_condo_meeting", label: "Criar assembleia", group: "Condominio", example: { condoId: "", date: "2026-07-10", kind: "ordinaria" } },
];

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="flex min-h-[88px] items-center justify-between p-4">
      <div>
        <p className="section-label text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
      </div>
      <div className="text-primary">{icon}</div>
    </Card>
  );
}

function todayDatePart(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

function timePart(value: string): string {
  return value.slice(11, 16);
}

function buildDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leading = start.getDay();
  const cells: { date: Date; muted: boolean }[] = [];

  for (let i = leading - 1; i >= 0; i -= 1) {
    cells.push({
      date: new Date(month.getFullYear(), month.getMonth(), -i),
      muted: true,
    });
  }
  for (let day = 1; day <= end.getDate(); day += 1) {
    cells.push({
      date: new Date(month.getFullYear(), month.getMonth(), day),
      muted: false,
    });
  }
  while (cells.length < 35) {
    const last = cells[cells.length - 1]!.date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      muted: true,
    });
  }
  return cells;
}

function monthFromDatePart(value: string): Date {
  const [year, month] = value.split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function timeFromMinutes(value: number): string {
  const rounded = Math.round(value / 15) * 15;
  const safe = Math.min(23 * 60 + 45, Math.max(0, rounded));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

const friendlyFieldLabels: Record<string, string> = {
  amount: "Valor",
  adminFeePct: "Taxa de administração (%)",
  apportionment: "Forma de rateio",
  askingPrice: "Preço pedido",
  brokerUserId: "Corretor responsável",
  buyerClientId: "Comprador",
  clientId: "Cliente",
  condoId: "Condomínio",
  conditions: "Condições",
  currentResidentClientId: "Morador atual",
  date: "Data",
  description: "Descrição",
  dueDate: "Vencimento",
  dueDay: "Dia de vencimento",
  email: "E-mail",
  endDate: "Fim do contrato",
  finalPrice: "Valor final",
  fractionPct: "Fração ideal (%)",
  funnelStage: "Etapa do funil",
  guarantorClientId: "Fiador",
  interest: "Interesse",
  kind: "Tipo",
  landlordClientId: "Proprietário",
  leadId: "Lead",
  listingId: "Anúncio",
  lostReason: "Motivo da perda",
  method: "Forma de cobrança",
  monthlyValue: "Valor mensal",
  name: "Nome",
  note: "Observação",
  offeredPrice: "Valor da proposta",
  ownerClientId: "Proprietário",
  paymentTerms: "Condições de pagamento",
  phone: "Telefone",
  propertyId: "Imóvel",
  proposalId: "Proposta",
  referenceMonth: "Mês de referência",
  scheduledAt: "Agendado para",
  sellerClientId: "Vendedor",
  source: "Origem",
  sourceId: "Parcela/taxa de origem",
  startDate: "Início do contrato",
  status: "Status",
  tenantClientId: "Inquilino",
  totalAmount: "Valor total",
  whatsapp: "WhatsApp",
};

function fieldLabel(key: string): string {
  return friendlyFieldLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function clientDetail(client: AutomationClientOption): string {
  return client.whatsapp || client.phone || "sem telefone";
}

type AutomationClientOption = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
};

type AutomationPropertyOption = {
  id: string;
  address: string;
  status: string;
};

export function CalendarExperience({ initialEvents, initialAutomations = [], initialClients = [], initialProperties = [] }: { initialEvents: UnifiedEvent[]; initialAutomations?: AutomationRule[]; initialClients?: AutomationClientOption[]; initialProperties?: AutomationPropertyOption[] }) {
  const today = todayDatePart();
  const [currentMonth, setCurrentMonth] = useState(monthFromDatePart(today));
  const [events, setEvents] = useState<UnifiedEvent[]>(initialEvents);
  const [automations, setAutomations] = useState<AutomationRule[]>(initialAutomations);
  const [selectedDate, setSelectedDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(`${today}T09:00`);
  const [tone, setTone] = useState<CalendarTone>("meeting");
  const [automationName, setAutomationName] = useState("");
  const [automationDescription, setAutomationDescription] = useState("");
  const [triggerKind, setTriggerKind] = useState<AutomationTriggerKind>("once");
  const [automationDate, setAutomationDate] = useState(today);
  const [automationTime, setAutomationTime] = useState("09:00");
  const [weekDays, setWeekDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthDays, setMonthDays] = useState("1");
  const [intervalDays, setIntervalDays] = useState("3");
  const [chargeOffsetDays, setChargeOffsetDays] = useState("0");
  const [actionKind, setActionKind] = useState<AutomationActionKind>("create_client");
  const [targetId, setTargetId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [payloadText, setPayloadText] = useState(JSON.stringify(actionOptions[0]!.example, null, 2));
  const [automationFeedback, setAutomationFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => buildDays(currentMonth), [currentMonth]);

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => datePart(event.startsAt).startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [currentMonth, events],
  );

  const summary = useMemo(() => {
    return {
      task: visibleEvents.filter((event) => event.tone === "task").length,
      meeting: visibleEvents.filter((event) => event.tone === "meeting").length,
      payment: visibleEvents.filter((event) => event.tone === "payment").length,
      board: visibleEvents.filter((event) => event.tone === "board" || event.tone === "visit").length,
    };
  }, [visibleEvents]);

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

  const selectedDayEvents = useMemo(
    () => visibleEvents.filter((event) => datePart(event.startsAt) === selectedDate),
    [selectedDate, visibleEvents],
  );

  const upcomingEvents = useMemo(
    () => events.filter((event) => event.startsAt >= `${today}T00:00`).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6),
    [events, today],
  );

  function resetModal(date = selectedDate) {
    setTitle("");
    setStartsAt(`${date}T09:00`);
    setTone("meeting");
    setError(null);
  }

  function resetAutomationModal(date = selectedDate) {
    setAutomationName("");
    setAutomationDescription("");
    setTriggerKind("once");
    setAutomationDate(date);
    setAutomationTime("09:00");
    setWeekDays([1, 2, 3, 4, 5]);
    setMonthDays(String(Number(date.slice(8, 10)) || 1));
    setIntervalDays("3");
    setChargeOffsetDays("0");
    setActionKind("create_client");
    setTargetId("");
    setClientSearch("");
    setPropertySearch("");
    setPayloadText(JSON.stringify(actionOptions[0]!.example, null, 2));
    setAutomationFeedback(null);
    setError(null);
  }

  function eventFromAutomation(rule: AutomationRule): UnifiedEvent | null {
    if (!rule.nextRunAt) return null;
    return {
      id: `a-${rule.id}`,
      title: `Automação: ${rule.name}`,
      startsAt: rule.nextRunAt,
      tone: "task",
      source: "automation",
    };
  }

  function buildAutomationPayload() {
    const payload = JSON.parse(payloadText || "{}");
    const trigger = {
      kind: triggerKind,
      localDate: triggerKind === "once" || triggerKind === "interval_days" ? automationDate : null,
      localTime: automationTime,
      weekDays: triggerKind === "weekly" ? weekDays : undefined,
      monthDays: triggerKind === "monthly" ? monthDays.split(",").map((day) => Number(day.trim())).filter(Boolean) : undefined,
      intervalDays: triggerKind === "interval_days" ? Number(intervalDays) : undefined,
      chargeOffsetDays: triggerKind === "charge_due" ? Number(chargeOffsetDays) : undefined,
    };
    return {
      name: automationName.trim(),
      description: automationDescription.trim() || null,
      status: "active" as const,
      trigger,
      action: {
        kind: actionKind,
        targetId: targetId.trim() || null,
        payload,
      },
    };
  }

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

  function renderGuidedPayloadForm() {
    const payload = parsedPayload();

    function renderClientPicker(key: string, label: string) {
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

    if (actionKind === "create_client") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Nome do cliente</label>
            <input
              value={String(payload.name ?? "")}
              onChange={(event) => updatePayloadField("name", event.target.value)}
              placeholder="Ex.: Maria Silva (nome e sobrenome)"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Telefone obrigatório</label>
            <input
              value={String(payload.phone ?? "")}
              onChange={(event) => updatePayloadField("phone", event.target.value)}
              placeholder="(11) 99999-9999"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">WhatsApp</label>
            <input
              value={String(payload.whatsapp ?? "")}
              onChange={(event) => updatePayloadField("whatsapp", event.target.value)}
              placeholder="Se for diferente do telefone"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input
              value={String(payload.email ?? "")}
              onChange={(event) => updatePayloadField("email", event.target.value)}
              placeholder="cliente@email.com"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo</label>
            <select
              value={String(payload.kind ?? "pf")}
              onChange={(event) => updatePayloadField("kind", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
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
            <input
              type="number"
              min={0}
              step="0.01"
              value={String(payload.amount ?? "")}
              onChange={(event) => updatePayloadField("amount", event.target.value)}
              placeholder="Ex.: 850,00"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Vencimento</label>
            <DateTimePicker
              value={String(payload.dueDate ?? today)}
              onChange={(value) => updatePayloadField("dueDate", value)}
              mode="date"
              placeholder="Escolher vencimento"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Forma de cobrança</label>
            <select
              value={String(payload.method ?? "boleto")}
              onChange={(event) => updatePayloadField("method", event.target.value)}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="boleto">Boleto</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <input
              value={String(payload.description ?? "")}
              onChange={(event) => updatePayloadField("description", event.target.value)}
              placeholder="Ex.: Aluguel de julho"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      );
    }

    return <div className="grid gap-3 md:grid-cols-2">{Object.entries(payload).map(([key, value]) => renderPayloadField(key, value))}</div>;
  }

  async function submitEvent() {
    if (!title.trim()) {
      setError("Informe um titulo para o evento.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) {
      setError("Escolha data e horario.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startsAt,
          endsAt: null,
          tone,
          notes: null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { event?: UnifiedEvent; error?: string } | null;
      if (!res.ok || !data?.event) {
        setError(data?.error ?? "Nao foi possivel salvar o evento.");
        return;
      }
      setEvents((current) => [...current, data.event!].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setCurrentMonth(monthFromDatePart(datePart(data.event.startsAt)));
      setSelectedDate(datePart(data.event.startsAt));
      setOpen(false);
      resetModal(datePart(data.event.startsAt));
    });
  }

  async function deleteManualEvent(event: UnifiedEvent) {
    if (!event.manualId || isPending) return;
    startTransition(async () => {
      const res = await fetch(`/api/calendar/${event.manualId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Nao foi possivel remover o evento.");
        return;
      }
      setEvents((current) => current.filter((item) => item.id !== event.id));
    });
  }

  async function submitAutomation() {
    if (!automationName.trim()) {
      setError("Informe um nome para a automação.");
      return;
    }

    let body: ReturnType<typeof buildAutomationPayload>;
    try {
      body = buildAutomationPayload();
    } catch {
      setError("O payload precisa ser um JSON válido.");
      return;
    }
    const requiresChargeClient = actionKind === "create_charge_standalone" || actionKind === "create_charge_and_send_whatsapp";
    if (actionKind === "create_client" && String(body.action.payload.name ?? "").trim().split(/\s+/).filter(Boolean).length < 2) {
      setError("Informe nome e sobrenome do cliente.");
      return;
    }
    if (actionKind === "create_client" && !String(body.action.payload.phone ?? "").trim()) {
      setError("Informe o telefone do cliente.");
      return;
    }
    if (requiresChargeClient && !String(body.action.payload.clientId ?? "").trim()) {
      setError("Selecione o cliente que receberá o boleto.");
      return;
    }
    if (requiresChargeClient && Number(body.action.payload.amount ?? 0) <= 0) {
      setError("Informe um valor maior que zero para o boleto.");
      return;
    }
    if (actionKind === "create_property" && !String(body.action.payload.address ?? "").trim()) {
      setError("Informe o endereço do imóvel.");
      return;
    }
    if (actionKind === "create_rental_contract") {
      if (!String(body.action.payload.propertyId ?? "").trim()) {
        setError("Selecione o imóvel da locação.");
        return;
      }
      if (!String(body.action.payload.landlordClientId ?? "").trim()) {
        setError("Selecione o proprietário da locação.");
        return;
      }
      if (!String(body.action.payload.tenantClientId ?? "").trim()) {
        setError("Selecione o inquilino da locação.");
        return;
      }
    }

    setError(null);
    setAutomationFeedback(null);
    startTransition(async () => {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { rule?: AutomationRule; error?: string } | null;
      if (!res.ok || !data?.rule) {
        setError(data?.error ?? "Não foi possível salvar a automação.");
        return;
      }
      setAutomations((current) => [data.rule!, ...current]);
      const event = eventFromAutomation(data.rule);
      if (event) setEvents((current) => [...current.filter((item) => item.id !== event.id), event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setAutomationOpen(false);
      resetAutomationModal(datePart(data.rule.nextRunAt ?? `${automationDate}T00:00`));
    });
  }

  async function toggleAutomation(rule: AutomationRule) {
    const status = rule.status === "active" ? "paused" : "active";
    startTransition(async () => {
      const res = await fetch(`/api/automation/${rule.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as { rule?: AutomationRule; error?: string } | null;
      if (!res.ok || !data?.rule) {
        setError(data?.error ?? "Não foi possível atualizar a automação.");
        return;
      }
      setAutomations((current) => current.map((item) => (item.id === rule.id ? data.rule! : item)));
      const event = eventFromAutomation(data.rule);
      setEvents((current) => {
        const without = current.filter((item) => item.id !== `a-${rule.id}`);
        return event ? [...without, event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) : without;
      });
    });
  }

  async function testAutomation(rule: AutomationRule) {
    setAutomationFeedback(null);
    const res = await fetch(`/api/automation/${rule.id}/test`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setAutomationFeedback(res.ok ? "Simulação validada sem executar ações." : data?.error ?? "Falha na simulação.");
  }

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Agenda"
        title="Calendario"
        description="Agenda integrada com visitas, contratos, assembleias, vencimentos e eventos manuais."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                resetAutomationModal();
                setAutomationOpen(true);
              }}
            >
              <Settings2 /> Nova automação
            </Button>
            <Button
              size="lg"
              onClick={() => {
                resetModal();
                setOpen(true);
              }}
            >
              <Plus /> Novo evento
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const todayPart = todayDatePart();
              setCurrentMonth(monthFromDatePart(todayPart));
              setSelectedDate(todayPart);
            }}
          >
            Hoje
          </Button>
          <button
            type="button"
            aria-label="Mes anterior"
            title="Mes anterior"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Proximo mes"
            title="Proximo mes"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <ChevronRight className="size-4" />
          </button>
          <p className="font-semibold capitalize text-foreground">{monthLabel(currentMonth)}</p>
        </div>

        <div className="flex w-full overflow-hidden rounded-2xl border border-primary/18 bg-card/55 p-1 text-sm xl:w-auto">
          {["Todos", "Mes", "Semana", "Agenda", "Planejamento"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={
                tab === "Mes"
                  ? "rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-glow"
                  : "rounded-xl px-4 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              }
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Tarefas" value={String(summary.task)} icon={<CheckSquare className="size-5" />} />
        <SummaryCard label="Reunioes" value={String(summary.meeting)} icon={<Users className="size-5" />} />
        <SummaryCard label="Financeiro" value={String(summary.payment)} icon={<Building2 className="size-5" />} />
        <SummaryCard label="Operacao" value={String(summary.board)} icon={<LayoutDashboard className="size-5" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="overflow-x-auto rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-4 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-7 gap-1 pb-2 section-label text-muted-foreground">
              {weekdays.map((day) => (
                <div key={day} className="px-3 py-2 text-center">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((item) => {
                const iso = `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}-${String(item.date.getDate()).padStart(2, "0")}`;
                const dayEvents = visibleEvents.filter((event) => datePart(event.startsAt) === iso);
                const isToday = iso === today;

                return (
                  <button
                    type="button"
                    key={`${iso}-${item.muted ? "muted" : "live"}`}
                    onClick={() => {
                      setSelectedDate(iso);
                      resetModal(iso);
                    }}
                    className={[
                      "min-h-[118px] rounded-lg border bg-primary/5 p-2 text-left transition",
                      item.muted
                        ? "border-primary/6 text-muted-foreground/50"
                        : "border-primary/12 text-foreground hover:border-primary/35 hover:bg-primary/10",
                      isToday ? "border-primary/80 bg-primary/10 shadow-glow-lg" : "",
                      selectedDate === iso ? "ring-2 ring-primary/55" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className={isToday ? "font-bold text-primary text-glow" : ""}>{item.date.getDate()}</div>
                      {dayEvents.length ? (
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {dayEvents.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className={`rounded-md px-2 py-1 text-[11px] ${toneStyle[event.tone]}`}>
                          <div className="truncate font-medium">{event.title}</div>
                          <div className="mt-0.5 text-[10px] opacity-80">{timePart(event.startsAt)}</div>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.35rem] border-primary/18 bg-card/55 p-5">
          <p className="section-label text-primary/80">Dia selecionado</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(`${selectedDate}T12:00`))}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedDayEvents.length ? `${selectedDayEvents.length} compromisso(s)` : "Sem compromissos"}
          </p>

          <div className="mt-5 space-y-2">
            {selectedDayEvents.length ? (
              selectedDayEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-primary/12 bg-background/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timePart(event.startsAt)} - {sourceLabel[event.source]}
                      </p>
                    </div>
                    {event.manualId ? (
                      <button
                        type="button"
                        aria-label="Remover evento"
                        title="Remover evento"
                        onClick={() => deleteManualEvent(event)}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-primary/18 bg-background/14 p-4 text-sm text-muted-foreground">
                Crie um evento manual ou acompanhe automaticamente vencimentos, visitas, contratos e assembleias.
              </div>
            )}
          </div>

          <Button
            className="mt-5 w-full"
            onClick={() => {
              resetAutomationModal(selectedDate);
              setAutomationOpen(true);
            }}
          >
            <Settings2 />
            Nova automação nesta data
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-primary" />
            <div>
              <p className="section-label text-primary/80">Agenda integrada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Eventos manuais ficam em calendario; vencimentos, visitas, contratos e assembleias entram dos modulos.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="section-label text-primary/80">Proximos</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{upcomingEvents.length} eventos</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {upcomingEvents[0]?.title ?? "Sem eventos futuros registrados."}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label text-primary/80">Agenda do modulo</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Feed operacional consolidado para apresentacao e uso diario.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-primary/80">Eventos do mes</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{visibleEvents.length}</p>
          </div>
        </div>
        {upcomingEvents.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-primary/12 bg-background/18 p-3">
                <p className="text-xs uppercase tracking-wide text-primary/75">{datePart(event.startsAt).split("-").reverse().join("/")}</p>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timePart(event.startsAt)} - {sourceLabel[event.source]}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-label text-primary/80">Automações automáticas</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Execuções rodam como system/admin no fuso America/Sao_Paulo, sem ações de exclusão.
            </p>
          </div>
          <Button
            onClick={() => {
              resetAutomationModal(selectedDate);
              setAutomationOpen(true);
            }}
          >
            <Settings2 /> Configurar automação
          </Button>
        </div>
        {automationFeedback ? (
          <p className="mt-4 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
            {automationFeedback}
          </p>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {automations.length ? automations.slice(0, 9).map((rule) => (
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
                <Button type="button" size="sm" variant="outline" onClick={() => toggleAutomation(rule)} disabled={isPending}>
                  <Clock3 className="size-3.5" /> {rule.status === "active" ? "Pausar" : "Ativar"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => testAutomation(rule)} disabled={isPending}>
                  <PlayCircle className="size-3.5" /> Testar
                </Button>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-primary/18 bg-background/14 p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              Nenhuma automação cadastrada. Crie uma regra para executar tarefas no horário, por recorrência ou por vencimento.
            </div>
          )}
        </div>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Novo evento</h2>
              <button
                type="button"
                aria-label="Fechar"
                title="Fechar"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="event-title" className="text-sm font-medium text-foreground">
                  Titulo
                </label>
                <input
                  id="event-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ex.: Reuniao com cliente, envio de lembrete, visita"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Data e hora</label>
                  <DateTimePicker
                    value={startsAt}
                    onChange={setStartsAt}
                    mode="datetime"
                    placeholder="Selecionar horario"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="event-tone" className="text-sm font-medium text-foreground">
                    Categoria
                  </label>
                  <select
                    id="event-tone"
                    value={tone}
                    onChange={(event) => setTone(event.target.value as CalendarTone)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="meeting">Reuniao</option>
                    <option value="task">Tarefa</option>
                    <option value="payment">Financeiro</option>
                    <option value="board">Planejamento</option>
                    <option value="visit">Visita</option>
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/18 bg-primary/6 p-4">
                <p className="text-xs uppercase tracking-wide text-primary/80">Preview</p>
                <div className="mt-3 flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl border border-primary/30 bg-primary/14 text-primary">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {title.trim() || "Novo evento"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "full",
                        timeStyle: "short",
                      }).format(new Date(startsAt))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={submitEvent} disabled={isPending}>
                  <Plus className="size-4" />
                  {isPending ? "Salvando..." : "Salvar evento"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {automationOpen ? (
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
                onClick={() => setAutomationOpen(false)}
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="space-y-5">
                {error ? (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="automation-name" className="text-sm font-medium text-foreground">Nome</label>
                    <input
                      id="automation-name"
                      value={automationName}
                      onChange={(event) => setAutomationName(event.target.value)}
                      placeholder="Ex.: Gerar boleto mensal"
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="automation-description" className="text-sm font-medium text-foreground">Descrição</label>
                    <input
                      id="automation-description"
                      value={automationDescription}
                      onChange={(event) => setAutomationDescription(event.target.value)}
                      placeholder="Opcional"
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/16 bg-background/16 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock3 className="size-4 text-primary" /> Quando disparar
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <label htmlFor="trigger-kind" className="text-sm font-medium text-foreground">Recorrência</label>
                      <select
                        id="trigger-kind"
                        value={triggerKind}
                        onChange={(event) => setTriggerKind(event.target.value as AutomationTriggerKind)}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {triggerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                      <p className="text-xs text-muted-foreground">{selectedTrigger.hint}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {triggerKind === "once" || triggerKind === "interval_days" ? (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-medium text-foreground">Data inicial</label>
                        <DateTimePicker
                          value={automationDateTime}
                          onChange={(value) => {
                            const [date, time] = value.split("T");
                            if (date) setAutomationDate(date);
                            if (time) setAutomationTime(time);
                          }}
                          mode="datetime"
                          placeholder="Abrir calendário e escolher data/hora"
                        />
                      </div>
                    ) : null}
                    <div className="space-y-3 md:col-span-2 rounded-2xl border border-primary/12 bg-primary/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Horário de execução</p>
                          <p className="text-xs text-muted-foreground">Arraste para ajustar em passos de 15 minutos.</p>
                        </div>
                        <div className="rounded-2xl border border-primary/25 bg-primary/12 px-4 py-2 font-display text-2xl font-bold text-primary text-glow">
                          {automationTime}
                        </div>
                      </div>
                      <input
                        aria-label="Horário de execução"
                        type="range"
                        min={0}
                        max={1425}
                        step={15}
                        value={automationMinutes}
                        onChange={(event) => setAutomationTime(timeFromMinutes(Number(event.target.value)))}
                        className="h-2 w-full cursor-pointer accent-primary"
                      />
                      <div className="flex flex-wrap gap-2">
                        {["08:00", "09:00", "12:00", "14:00", "18:00"].map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setAutomationTime(time)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${automationTime === time ? "bg-primary text-primary-foreground" : "bg-background/40 text-muted-foreground hover:bg-primary/10"}`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                    {triggerKind === "weekly" ? (
                      <div className="space-y-2 md:col-span-2">
                        <p className="text-sm font-medium text-foreground">Dias da semana</p>
                        <div className="flex flex-wrap gap-2">
                          {weekdays.map((label, index) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setWeekDays((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort())}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${weekDays.includes(index) ? "bg-primary text-primary-foreground" : "bg-background/40 text-muted-foreground hover:bg-primary/10"}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {triggerKind === "monthly" ? (
                      <div className="space-y-1.5 md:col-span-2">
                        <label htmlFor="month-days" className="text-sm font-medium text-foreground">Dias do mês</label>
                        <input
                          id="month-days"
                          value={monthDays}
                          onChange={(event) => setMonthDays(event.target.value)}
                          placeholder="Ex.: 1, 10, 20"
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    ) : null}
                    {triggerKind === "interval_days" ? (
                      <div className="space-y-1.5">
                        <label htmlFor="interval-days" className="text-sm font-medium text-foreground">A cada quantos dias</label>
                        <input
                          id="interval-days"
                          type="number"
                          min={1}
                          value={intervalDays}
                          onChange={(event) => setIntervalDays(event.target.value)}
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      </div>
                    ) : null}
                    {triggerKind === "charge_due" ? (
                      <div className="space-y-1.5 md:col-span-2">
                        <label htmlFor="charge-offset" className="text-sm font-medium text-foreground">Offset do vencimento</label>
                        <select
                          id="charge-offset"
                          value={chargeOffsetDays}
                          onChange={(event) => setChargeOffsetDays(event.target.value)}
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
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
                        onClick={() => {
                          const action = actionOptions.find((item) => item.value === option.kind)!;
                          setActionKind(option.kind);
                          setPayloadText(JSON.stringify(action.example, null, 2));
                          setTargetId("");
                        }}
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
                      <select
                        id="action-kind"
                        value={actionKind}
                        onChange={(event) => {
                          const value = event.target.value as AutomationActionKind;
                          const option = actionOptions.find((item) => item.value === value) ?? actionOptions[0]!;
                          setActionKind(value);
                          setPayloadText(JSON.stringify(option.example, null, 2));
                          setTargetId("");
                        }}
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.group} - {option.label}</option>)}
                      </select>
                      </div>
                    {selectedAction.target ? <div className="space-y-1.5">
                      <label htmlFor="target-id" className="text-sm font-medium text-foreground">Registro que será alterado {selectedAction.target ? "(obrigatório)" : "(se precisar)"}</label>
                      <input
                        id="target-id"
                        value={targetId}
                        onChange={(event) => setTargetId(event.target.value)}
                        placeholder="Cole o código do cliente, cobrança, lead..."
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground">Só use este campo quando a ação for editar, baixar ou ratear algo existente.</p>
                    </div> : null}
                    </div>
                  </details>
                  <div className="mt-4 rounded-2xl border border-primary/12 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Dados da ação</p>
                        <p className="mt-1 text-xs text-muted-foreground">Preencha como um formulário. A configuração técnica fica escondida em avançado.</p>
                      </div>
                      <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {selectedAction.group}
                      </span>
                    </div>
                    <div className="mt-4">{renderGuidedPayloadForm()}</div>
                    <details className="mt-4 rounded-xl border border-primary/12 bg-background/35 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground transition hover:text-primary">
                        Configuração avançada
                      </summary>
                      <p className="mt-2 text-xs text-muted-foreground">Use apenas se precisar ajustar campos que ainda não aparecem no formulário.</p>
                      <textarea
                        id="payload-json"
                        value={payloadText}
                        onChange={(event) => setPayloadText(event.target.value)}
                        spellCheck={false}
                        rows={8}
                        className="mt-3 w-full rounded-xl border border-input bg-background p-4 font-mono text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      />
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
                  <p className="mt-3 text-sm text-muted-foreground">
                    Para ações de criação, preencha os dados normalmente. Para edição, cole o código do registro que deve ser alterado.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-primary/12 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setAutomationOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={submitAutomation} disabled={isPending}>
                <Settings2 className="size-4" />
                {isPending ? "Salvando..." : "Salvar automação"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
