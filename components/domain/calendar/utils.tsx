import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { friendlyFieldLabels } from "./constants";
import type { AutomationClientOption } from "./types";

export function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
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

export function todayDatePart(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function datePart(value: string): string {
  return value.slice(0, 10);
}

export function timePart(value: string): string {
  return value.slice(11, 16);
}

export function buildDays(month: Date) {
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

export function monthFromDatePart(value: string): Date {
  const [year, month] = value.split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1);
}

export function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function timeFromMinutes(value: number): string {
  const rounded = Math.round(value / 15) * 15;
  const safe = Math.min(23 * 60 + 45, Math.max(0, rounded));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function fieldLabel(key: string): string {
  return friendlyFieldLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

export function clientDetail(client: AutomationClientOption): string {
  return client.whatsapp || client.phone || "sem telefone";
}
