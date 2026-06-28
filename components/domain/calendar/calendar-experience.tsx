"use client";

import { S } from "@/lib/status";
import { useMemo, useState, useTransition } from "react";
import { Building2, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, LayoutDashboard, Plus, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UnifiedEvent } from "@/lib/repositories/calendar.repository";
import type { AutomationRule } from "@/lib/types/domain";
import { SummaryCard, todayDatePart, monthLabel, datePart, buildDays, monthFromDatePart } from "./utils";
import { CalendarGrid, SelectedDayPanel } from "./calendar-grid";
import { AutomationSection } from "./automation-section";
import { EventModal } from "./event-modal";
import { AutomationModal, type AutomationFormData } from "./automation-modal";
import type { AutomationClientOption, AutomationPropertyOption } from "./types";

export function CalendarExperience({
  initialEvents,
  initialAutomations = [],
  initialClients = [],
  initialProperties = [],
}: {
  initialEvents: UnifiedEvent[];
  initialAutomations?: AutomationRule[];
  initialClients?: AutomationClientOption[];
  initialProperties?: AutomationPropertyOption[];
}) {
  const today = todayDatePart();
  const [currentMonth, setCurrentMonth] = useState(monthFromDatePart(today));
  const [events, setEvents] = useState<UnifiedEvent[]>(initialEvents);
  const [automations, setAutomations] = useState<AutomationRule[]>(initialAutomations);
  const [selectedDate, setSelectedDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [startsAt, setStartsAt] = useState(`${today}T09:00`);
  const [tone, setTone] = useState<"task" | "meeting" | "payment" | "board" | "visit">("meeting");
  const [error, setError] = useState<string | null>(null);
  const [automationFeedback, setAutomationFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(() => buildDays(currentMonth), [currentMonth]);

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => datePart(event.startsAt).startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [currentMonth, events],
  );

  const summary = useMemo(() => ({
    task: visibleEvents.filter((event) => event.tone === "task").length,
    meeting: visibleEvents.filter((event) => event.tone === "meeting").length,
    payment: visibleEvents.filter((event) => event.tone === "payment").length,
    board: visibleEvents.filter((event) => event.tone === "board" || event.tone === "visit").length,
  }), [visibleEvents]);

  const selectedDayEvents = useMemo(
    () => visibleEvents.filter((event) => datePart(event.startsAt) === selectedDate),
    [selectedDate, visibleEvents],
  );

  const upcomingEvents = useMemo(
    () => events.filter((event) => event.startsAt >= `${today}T00:00`).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 6),
    [events, today],
  );

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

  async function submitEvent() {
    if (!eventTitle.trim()) { setError("Informe um titulo para o evento."); return; }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) { setError("Escolha data e horario."); return; }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: eventTitle.trim(), startsAt, endsAt: null, tone, notes: null }),
      });
      const data = (await res.json().catch(() => null)) as { event?: UnifiedEvent; error?: string } | null;
      if (!res.ok || !data?.event) { setError(data?.error ?? "Nao foi possivel salvar o evento."); return; }
      setEvents((current) => [...current, data.event!].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setCurrentMonth(monthFromDatePart(datePart(data.event.startsAt)));
      setSelectedDate(datePart(data.event.startsAt));
      setOpen(false);
    });
  }

  async function deleteManualEvent(event: UnifiedEvent) {
    if (!event.manualId || isPending) return;
    startTransition(async () => {
      const res = await fetch(`/api/calendar/${event.manualId}`, { method: "DELETE" });
      if (!res.ok) { setError("Nao foi possivel remover o evento."); return; }
      setEvents((current) => current.filter((item) => item.id !== event.id));
    });
  }

  async function submitAutomation(formData: AutomationFormData) {
    if (!formData.name) { setError("Informe um nome para a automação."); return; }
    if (formData.action.kind === "create_client" && String(formData.action.payload.name ?? "").trim().split(/\s+/).filter(Boolean).length < 2) { setError("Informe nome e sobrenome do cliente."); return; }
    if (formData.action.kind === "create_client" && !String(formData.action.payload.phone ?? "").trim()) { setError("Informe o telefone do cliente."); return; }
    if ((formData.action.kind === "create_charge_standalone" || formData.action.kind === "create_charge_and_send_whatsapp") && !String(formData.action.payload.clientId ?? "").trim()) { setError("Selecione o cliente que receberá o boleto."); return; }
    if ((formData.action.kind === "create_charge_standalone" || formData.action.kind === "create_charge_and_send_whatsapp") && Number(formData.action.payload.amount ?? 0) <= 0) { setError("Informe um valor maior que zero para o boleto."); return; }
    if (formData.action.kind === "create_property" && !String(formData.action.payload.address ?? "").trim()) { setError("Informe o endereço do imóvel."); return; }
    if (formData.action.kind === "create_rental_contract") {
      if (!String(formData.action.payload.propertyId ?? "").trim()) { setError("Selecione o imóvel da locação."); return; }
      if (!String(formData.action.payload.landlordClientId ?? "").trim()) { setError("Selecione o proprietário da locação."); return; }
      if (!String(formData.action.payload.tenantClientId ?? "").trim()) { setError("Selecione o inquilino da locação."); return; }
    }

    setError(null);
    setAutomationFeedback(null);
    startTransition(async () => {
      const body = { ...formData, status: S.ACTIVE };
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { rule?: AutomationRule; error?: string } | null;
      if (!res.ok || !data?.rule) { setError(data?.error ?? "Não foi possível salvar a automação."); return; }
      setAutomations((current) => [data.rule!, ...current]);
      const event = eventFromAutomation(data.rule);
      if (event) setEvents((current) => [...current.filter((item) => item.id !== event.id), event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setAutomationOpen(false);
    });
  }

  async function toggleAutomation(rule: AutomationRule) {
    const status = rule.status === S.ACTIVE ? S.PAUSED : S.ACTIVE;
    startTransition(async () => {
      const res = await fetch(`/api/automation/${rule.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as { rule?: AutomationRule; error?: string } | null;
      if (!res.ok || !data?.rule) { return; }
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
            <Button size="lg" variant="outline" onClick={() => setAutomationOpen(true)}>
              <Settings2 /> Nova automação
            </Button>
            <Button size="lg" onClick={() => { setEventTitle(""); setStartsAt(`${today}T09:00`); setTone("meeting"); setError(null); setOpen(true); }}>
              <Plus /> Novo evento
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { const d = todayDatePart(); setCurrentMonth(monthFromDatePart(d)); setSelectedDate(d); }}>
            Hoje
          </Button>
          <button type="button" aria-label="Mes anterior" title="Mes anterior" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Proximo mes" title="Proximo mes" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
            <ChevronRight className="size-4" />
          </button>
          <p className="font-semibold capitalize text-foreground">{monthLabel(currentMonth)}</p>
        </div>

        <div className="flex w-full overflow-hidden rounded-2xl border border-primary/18 bg-card/55 p-1 text-sm xl:w-auto">
          {["Todos", "Mes", "Semana", "Agenda", "Planejamento"].map((tab) => (
            <button key={tab} type="button" className={tab === "Mes" ? "rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-glow" : "rounded-xl px-4 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"}>
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
        <CalendarGrid days={days} visibleEvents={visibleEvents} today={today} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <SelectedDayPanel selectedDate={selectedDate} selectedDayEvents={selectedDayEvents} onDeleteEvent={deleteManualEvent} onNewAutomation={() => setAutomationOpen(true)} />
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
                <p className="mt-1 text-xs text-muted-foreground">{datePart(event.startsAt) && ""}{event.startsAt.slice(11, 16)} - {event.source === "manual" ? "Manual" : event.source === "charge" ? "Cobranca" : event.source === "contract" ? "Contrato" : event.source === "visit" ? "Visita" : event.source === "meeting" ? "Assembleia" : "Automacao"}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <AutomationSection
        automations={automations}
        feedback={automationFeedback}
        isPending={isPending}
        onToggle={toggleAutomation}
        onTest={testAutomation}
        onNew={() => setAutomationOpen(true)}
      />

      <EventModal
        open={open}
        error={error}
        title={eventTitle}
        startsAt={startsAt}
        tone={tone}
        isPending={isPending}
        onClose={() => setOpen(false)}
        onTitleChange={setEventTitle}
        onStartsAtChange={setStartsAt}
        onToneChange={setTone}
        onSubmit={submitEvent}
      />

      <AutomationModal
        open={automationOpen}
        error={error}
        isPending={isPending}
        initialClients={initialClients}
        initialProperties={initialProperties}
        onClose={() => setAutomationOpen(false)}
        onSubmit={submitAutomation}
      />
    </div>
  );
}
