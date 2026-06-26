"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PickerMode = "date" | "datetime";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const TIME_OPTIONS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const;

function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date, time: string): string {
  return `${formatDateOnly(date)}T${time}`;
}

function displayValue(value: string, mode: PickerMode, placeholder: string): string {
  const parsed = mode === "datetime" ? parseDateTime(value) : parseDateOnly(value);
  if (!parsed) return placeholder;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    ...(mode === "datetime"
      ? { timeStyle: "short" as const }
      : {}),
  }).format(parsed);
}

export function DateTimePicker({
  value,
  onChange,
  mode = "date",
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  mode?: PickerMode;
  placeholder?: string;
  className?: string;
}) {
  const parsed = mode === "datetime" ? parseDateTime(value) : parseDateOnly(value);
  const parsedYear = parsed?.getFullYear();
  const parsedMonth = parsed?.getMonth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(
    parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : new Date(),
  );
  const [position, setPosition] = useState({ top: 0, left: 0, width: 320 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function updatePosition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 320;
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - width - 12,
      );
      setPosition({
        top: rect.bottom + 8,
        left,
        width,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (parsedYear != null && parsedMonth != null) {
      setMonth(new Date(parsedYear, parsedMonth, 1));
    }
  }, [parsedMonth, parsedYear]);

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const leading = start.getDay();
    const total = end.getDate();
    const cells: { date: Date; muted: boolean }[] = [];

    for (let i = leading - 1; i >= 0; i -= 1) {
      cells.push({
        date: new Date(month.getFullYear(), month.getMonth(), -i),
        muted: true,
      });
    }
    for (let day = 1; day <= total; day += 1) {
      cells.push({
        date: new Date(month.getFullYear(), month.getMonth(), day),
        muted: false,
      });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]!.date;
      cells.push({
        date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
        muted: true,
      });
    }
    return cells;
  }, [month]);

  const selectedDate = parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : null;
  const selectedTime =
    mode === "datetime" && parsed
      ? `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`
      : "";

  function chooseDate(date: Date) {
    if (mode === "date") {
      onChange(formatDateOnly(date));
      setOpen(false);
      return;
    }
    const time = selectedTime || "09:00";
    onChange(formatDateTime(date, time));
  }

  function chooseTime(time: string) {
    const baseDate = selectedDate ?? new Date(month.getFullYear(), month.getMonth(), 1);
    onChange(formatDateTime(baseDate, time));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 text-left text-sm text-foreground outline-none transition hover:border-primary/45 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate">
          {displayValue(
            value,
            mode,
            placeholder ?? (mode === "datetime" ? "Selecionar data e hora" : "Selecionar data"),
          )}
        </span>
        {mode === "datetime" ? (
          <Clock3 className="size-4 text-primary" />
        ) : (
          <CalendarDays className="size-4 text-primary" />
        )}
      </button>

      {open && mounted
        ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[120] rounded-2xl border border-primary/18 bg-[#102f4d] p-4 shadow-2xl"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="font-semibold text-foreground">
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(month)}
            </p>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] font-semibold text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(({ date, muted }) => {
              const sameDay =
                selectedDate &&
                date.getFullYear() === selectedDate.getFullYear() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getDate() === selectedDate.getDate();
              const today = new Date();
              const isToday =
                date.getFullYear() === today.getFullYear() &&
                date.getMonth() === today.getMonth() &&
                date.getDate() === today.getDate();

              return (
                <button
                  key={`${date.toISOString()}-${muted ? "muted" : "live"}`}
                  type="button"
                  onClick={() => chooseDate(date)}
                  className={cn(
                    "grid h-10 place-items-center rounded-xl text-sm transition",
                    muted
                      ? "text-muted-foreground/45"
                      : "text-foreground hover:bg-primary/10",
                    sameDay && "bg-primary font-semibold text-primary-foreground shadow-glow",
                    isToday && !sameDay && "border border-primary/40 text-primary",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {mode === "datetime" ? (
            <div className="mt-4 space-y-3 border-t border-primary/12 pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock3 className="size-3.5" />
                Horario
              </div>
              <div className="grid grid-cols-4 gap-2">
                {TIME_OPTIONS.map((time) => (
                  <Button
                    key={time}
                    type="button"
                    size="sm"
                    variant={selectedTime === time ? "default" : "outline"}
                    className="px-0"
                    onClick={() => chooseTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
          , document.body)
        : null}
    </div>
  );
}
