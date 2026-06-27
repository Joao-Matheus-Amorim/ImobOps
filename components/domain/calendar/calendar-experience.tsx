"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Plus,
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
import type { CalendarTone } from "@/lib/types/domain";

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
};

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

export function CalendarExperience({ initialEvents }: { initialEvents: UnifiedEvent[] }) {
  const today = todayDatePart();
  const [currentMonth, setCurrentMonth] = useState(monthFromDatePart(today));
  const [events, setEvents] = useState<UnifiedEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState(today);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(`${today}T09:00`);
  const [tone, setTone] = useState<CalendarTone>("meeting");
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

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Agenda"
        title="Calendario"
        description="Agenda integrada com visitas, contratos, assembleias, vencimentos e eventos manuais."
        action={
          <Button
            size="lg"
            onClick={() => {
              resetModal();
              setOpen(true);
            }}
          >
            <Plus /> Novo evento
          </Button>
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
              resetModal(selectedDate);
              setOpen(true);
            }}
          >
            <Plus />
            Novo evento nesta data
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
    </div>
  );
}
