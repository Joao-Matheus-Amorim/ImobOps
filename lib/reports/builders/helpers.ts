// Shared helper utilities for report builders

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((endTime - startTime) / 86_400_000);
}

export function addDaysISO(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
