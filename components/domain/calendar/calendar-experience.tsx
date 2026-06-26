"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Plus,
  Users,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";

type EventTone = "task" | "meeting" | "payment" | "board";
type CalendarEvent = {
  id: string;
  label: string;
  startsAt: string;
  tone: EventTone;
};

const INITIAL_EVENTS: CalendarEvent[] = [
  { id: "e-10", label: "Enviar boletos do mes", startsAt: "2026-06-10T09:00", tone: "payment" },
  { id: "e-11", label: "PIX - confirmar recebimento", startsAt: "2026-06-11T10:00", tone: "payment" },
  { id: "e-16-a", label: "Saude dos clientes", startsAt: "2026-06-16T09:00", tone: "task" },
  { id: "e-16-b", label: "Revisar atrasados", startsAt: "2026-06-16T15:00", tone: "payment" },
  { id: "e-17", label: "Reuniao com cliente", startsAt: "2026-06-17T14:00", tone: "meeting" },
  { id: "e-18", label: "Contrato e vistoria", startsAt: "2026-06-18T11:00", tone: "task" },
  { id: "e-19", label: "Subir campanha imoveis", startsAt: "2026-06-19T16:00", tone: "board" },
  { id: "e-22", label: "Alinhamento financeiro", startsAt: "2026-06-22T10:00", tone: "meeting" },
  { id: "e-24", label: "Disparar lembrete PIX", startsAt: "2026-06-24T08:00", tone: "payment" },
  { id: "e-25", label: "Relatorio mensal", startsAt: "2026-06-25T17:00", tone: "task" },
];

const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const eventTone = {
  task: "bg-primary/25 text-foreground",
  meeting: "bg-sky-500/22 text-foreground",
  payment: "bg-primary/35 text-foreground shadow-glow-sm",
  board: "bg-indigo-400/20 text-foreground",
} satisfies Record<EventTone, string>;

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

export function CalendarExperience() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5, 1));
  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [startsAt, setStartsAt] = useState("2026-06-16T09:00");
  const [tone, setTone] = useState<EventTone>("meeting");
  const [error, setError] = useState<string | null>(null);

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
      board: visibleEvents.filter((event) => event.tone === "board").length,
    };
  }, [visibleEvents]);

  const agendaToday = useMemo(
    () => visibleEvents.filter((event) => datePart(event.startsAt) === "2026-06-16"),
    [visibleEvents],
  );

  function resetModal() {
    setLabel("");
    setStartsAt(`${datePart(startsAt)}T09:00`);
    setTone("meeting");
    setError(null);
  }

  function submitEvent() {
    if (!label.trim()) {
      setError("Informe um titulo para o evento.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt)) {
      setError("Escolha data e horario.");
      return;
    }

    setEvents((current) => [
      ...current,
      {
        id: `event-${Date.now()}`,
        label: label.trim(),
        startsAt,
        tone,
      },
    ]);
    setOpen(false);
    resetModal();
  }

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Agenda"
        title="Calendario"
        description="Tarefas, reunioes, boletos, PIX e pagamentos organizados por responsavel."
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
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date(2026, 5, 1))}>
            Hoje
          </Button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
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
        <SummaryCard label="Boards" value={String(summary.board)} icon={<LayoutDashboard className="size-5" />} />
      </div>

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
              const isToday = iso === "2026-06-16";

              return (
                <div
                  key={`${iso}-${item.muted ? "muted" : "live"}`}
                  className={[
                    "min-h-[114px] rounded-lg border bg-primary/5 p-2 transition",
                    item.muted
                      ? "border-primary/6 text-muted-foreground/50"
                      : "border-primary/12 text-foreground hover:border-primary/35 hover:bg-primary/10",
                    isToday ? "border-primary/80 bg-primary/10 shadow-glow-lg" : "",
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
                      <div
                        key={event.id}
                        className={`rounded-md px-2 py-1 text-[11px] ${eventTone[event.tone]}`}
                      >
                        <div className="truncate font-medium">{event.label}</div>
                        <div className="mt-0.5 text-[10px] opacity-80">{timePart(event.startsAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-primary" />
            <div>
              <p className="section-label text-primary/80">Fluxo de agenda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Datas e horarios agora entram por um picker visual, mantendo o mesmo padrão de modal do app.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="section-label text-primary/80">Hoje</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{agendaToday.length} rotinas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {agendaToday[0]?.label ?? "Sem rotinas registradas para hoje."}
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="section-label text-primary/80">Agenda do modulo</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Eventos do mes com foco em operacao, relacionamento e cobranca.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-primary/80">Eventos ativos</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{visibleEvents.length}</p>
          </div>
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
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
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
                    onChange={(event) => setTone(event.target.value as EventTone)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="meeting">Reuniao</option>
                    <option value="task">Tarefa</option>
                    <option value="payment">Financeiro</option>
                    <option value="board">Planejamento</option>
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
                      {label.trim() || "Novo evento"}
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
                <Button type="button" onClick={submitEvent}>
                  <Plus className="size-4" />
                  Salvar evento
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
