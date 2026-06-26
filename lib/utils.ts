import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
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

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCpfCnpj(value: string, kind: "pf" | "pj"): string {
  return kind === "pf" ? formatCpf(value) : formatCnpj(value);
}

export function isValidCpfCnpjLength(value: string, kind: "pf" | "pj"): boolean {
  const digits = onlyDigits(value);
  return digits.length === (kind === "pf" ? 11 : 14);
}

export function normalizeCpfCnpj(value: string, kind: "pf" | "pj"): string {
  const digits = onlyDigits(value);
  return formatCpfCnpj(digits, kind);
}

export function isValidBrazilPhoneLength(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 10 || digits.length === 11) return true;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    const local = digits.slice(2);
    return local.length === 10 || local.length === 11;
  }
  return false;
}

export function normalizeBrazilPhone(value: string): string {
  const digits = onlyDigits(value);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return `+${digits}`;
  }
  return `+55${digits.slice(0, 11)}`;
}

export function formatBrazilPhone(value: string): string {
  let digits = onlyDigits(value);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  digits = digits.slice(0, 11);

  const area = digits.slice(0, 2);
  const subscriber = digits.slice(2);

  if (!area) return "";
  if (digits.length <= 2) return `(${area}`;

  if (subscriber.length <= 4) return `(${area}) ${subscriber}`;
  if (subscriber.length <= 8) {
    return `(${area}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  }
  return `(${area}) ${subscriber.slice(0, 5)}-${subscriber.slice(5, 9)}`;
}
