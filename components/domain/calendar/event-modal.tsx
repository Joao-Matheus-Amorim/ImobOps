"use client";

import { Building2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import type { CalendarTone } from "@/lib/types/domain";

export function EventModal({
  open,
  error,
  title,
  startsAt,
  tone,
  isPending,
  onClose,
  onTitleChange,
  onStartsAtChange,
  onToneChange,
  onSubmit,
}: {
  open: boolean;
  error: string | null;
  title: string;
  startsAt: string;
  tone: CalendarTone;
  isPending: boolean;
  onClose: () => void;
  onTitleChange: (value: string) => void;
  onStartsAtChange: (value: string) => void;
  onToneChange: (value: CalendarTone) => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Novo evento</h2>
          <button
            type="button"
            aria-label="Fechar"
            title="Fechar"
            onClick={onClose}
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
            <label htmlFor="event-title" className="text-sm font-medium text-foreground">Titulo</label>
            <input
              id="event-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Ex.: Reuniao com cliente, envio de lembrete, visita"
              className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data e hora</label>
              <DateTimePicker
                value={startsAt}
                onChange={onStartsAtChange}
                mode="datetime"
                placeholder="Selecionar horario"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="event-tone" className="text-sm font-medium text-foreground">Categoria</label>
              <select
                id="event-tone"
                value={tone}
                onChange={(event) => onToneChange(event.target.value as CalendarTone)}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSubmit} disabled={isPending}>
              <Plus className="size-4" />
              {isPending ? "Salvando..." : "Salvar evento"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
