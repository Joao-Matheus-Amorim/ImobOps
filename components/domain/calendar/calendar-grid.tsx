"use client";

import { Trash2 } from "lucide-react";
import type { UnifiedEvent } from "@/lib/repositories/calendar.repository";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { weekdays, toneStyle, sourceLabel } from "./constants";
import { timePart, datePart } from "./utils";

export function CalendarGrid({
  days,
  visibleEvents,
  today,
  selectedDate,
  onSelectDate,
}: {
  days: { date: Date; muted: boolean }[];
  visibleEvents: UnifiedEvent[];
  today: string;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}) {
  return (
    <Card className="overflow-x-auto rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-4 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
      <div className="min-w-[960px]">
        <div className="grid grid-cols-7 gap-1 pb-2 section-label text-muted-foreground">
          {weekdays.map((day) => (
            <div key={day} className="px-3 py-2 text-center">{day}</div>
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
                onClick={() => onSelectDate(iso)}
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
  );
}

export function SelectedDayPanel({
  selectedDate,
  selectedDayEvents,
  onDeleteEvent,
  onNewAutomation,
}: {
  selectedDate: string;
  selectedDayEvents: UnifiedEvent[];
  onDeleteEvent: (event: UnifiedEvent) => void;
  onNewAutomation: () => void;
}) {
  return (
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
                    onClick={() => onDeleteEvent(event)}
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

      <Button className="mt-5 w-full" onClick={onNewAutomation}>
        Nova automação nesta data
      </Button>
    </Card>
  );
}
