import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a number as BRL currency.
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Format an ISO date as dd/mm/yyyy.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

// Format a YYYY-MM reference month as "mmm/yyyy".
export function formatReferenceMonth(ref: string): string {
  const [y, m] = ref.split("-").map(Number);
  if (!y || !m) return ref;
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(d);
}

// Add N months to a Date, returning a new Date.
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

// Clamp the day-of-month to a valid due day in [1, 28].
export function clampDueDay(day: number): number {
  return Math.min(28, Math.max(1, Math.round(day)));
}

// Round to 2 decimals (currency-safe).
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// Stable, deterministic pseudo-id for mock data and tests.
export function deterministicId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(8, "0")}`;
}

// Initials from a display name.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
