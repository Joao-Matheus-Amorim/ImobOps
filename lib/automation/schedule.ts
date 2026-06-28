import type { AutomationTriggerConfig } from "@/lib/types/domain";

export const AUTOMATION_TIMEZONE = "America/Sao_Paulo" as const;
const SAO_PAULO_OFFSET = "-03:00";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toSaoPauloLocalIso(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: AUTOMATION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date).replace(" ", "T");
}

function localToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00${SAO_PAULO_OFFSET}`).toISOString();
}

function addLocalDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function compareLocalCandidate(date: string, time: string, after: Date): number {
  return localToUtcIso(date, time).localeCompare(after.toISOString());
}

export function nextRunAt(trigger: AutomationTriggerConfig, after = new Date()): string | null {
  const localNow = toSaoPauloLocalIso(after);
  const localDate = localNow.slice(0, 10);
  const time = trigger.localTime || "09:00";

  if (trigger.kind === "once") {
    if (!trigger.localDate) return null;
    const iso = localToUtcIso(trigger.localDate, time);
    return iso > after.toISOString() ? iso : null;
  }

  if (trigger.kind === "daily") {
    const date = compareLocalCandidate(localDate, time, after) > 0 ? localDate : addLocalDays(localDate, 1);
    return localToUtcIso(date, time);
  }

  if (trigger.kind === "weekly") {
    const allowed = new Set((trigger.weekDays?.length ? trigger.weekDays : [1]).map(Number));
    for (let offset = 0; offset <= 14; offset += 1) {
      const date = addLocalDays(localDate, offset);
      const weekday = new Date(`${date}T12:00:00${SAO_PAULO_OFFSET}`).getUTCDay();
      if (!allowed.has(weekday)) continue;
      if (offset > 0 || compareLocalCandidate(date, time, after) > 0) return localToUtcIso(date, time);
    }
  }

  if (trigger.kind === "monthly") {
    const days = (trigger.monthDays?.length ? trigger.monthDays : [1]).map(Number).sort((a, b) => a - b);
    const [year, month] = localDate.split("-").map(Number);
    for (let monthOffset = 0; monthOffset <= 13; monthOffset += 1) {
      const cursor = new Date(Date.UTC(year, month - 1 + monthOffset, 1, 12));
      const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 12)).getUTCDate();
      for (const rawDay of days) {
        const day = Math.min(Math.max(1, rawDay), last);
        const date = `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(day)}`;
        if (date < localDate) continue;
        if (date > localDate || compareLocalCandidate(date, time, after) > 0) return localToUtcIso(date, time);
      }
    }
  }

  if (trigger.kind === "interval_days") {
    const every = Math.max(1, trigger.intervalDays ?? 3);
    let date = trigger.localDate && trigger.localDate >= localDate ? trigger.localDate : localDate;
    while (compareLocalCandidate(date, time, after) <= 0) date = addLocalDays(date, every);
    return localToUtcIso(date, time);
  }

  return null;
}

export function chargeOffsetRunAt(dueDate: string, offsetDays: number, localTime: string): string {
  return localToUtcIso(addLocalDays(dueDate, offsetDays), localTime || "09:00");
}
