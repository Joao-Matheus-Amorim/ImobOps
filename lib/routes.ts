// Centralized route map. Keep in sync with app/ folder.
import type { FeatureKey } from "./types/permissions";

export const routes = {
  login: "/login",
  resetPassword: "/reset-password",
  dashboard: "/dashboard",
  clients: "/clients",
  client: (id: string) => `/clients/${id}`,
  properties: "/properties",
  property: (id: string) => `/properties/${id}`,
  rentals: "/rentals",
  rental: (id: string) => `/rentals/${id}`,
  sales: "/sales",
  sale: (id: string) => `/sales/${id}`,
  condos: "/condos",
  condo: (id: string) => `/condos/${id}`,
  finance: "/finance",
  calendar: "/calendar",
  crm: "/crm",
  whatsapp: "/whatsapp",
  assistant: "/assistant",
  admin: "/admin",
} as const;

// Navigation entries. Each gates on a feature key.
export interface NavEntry {
  href: string;
  label: string;
  icon: string; // lucide icon name
  feature: FeatureKey;
}

// A labeled group of nav entries (sidebar sections).
export interface NavGroup {
  label: string;
  entries: NavEntry[];
}

// Full sidebar, grouped like the G7 reference (OPERAÇÃO / CRESCIMENTO / ADMINISTRAÇÃO).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operação",
    entries: [
      { href: routes.dashboard, label: "Dashboard", icon: "LayoutDashboard", feature: "clients" },
      { href: routes.assistant, label: "Assistente IA", icon: "Sparkles", feature: "assistant" },
      { href: routes.clients, label: "Clientes", icon: "Contact", feature: "clients" },
      { href: routes.calendar, label: "Calendario", icon: "CalendarDays", feature: "calendar" },
      { href: routes.properties, label: "Imóveis", icon: "Building2", feature: "properties" },
      { href: routes.rentals, label: "Locação", icon: "KeyRound", feature: "rentals" },
      { href: routes.sales, label: "Vendas", icon: "Handshake", feature: "sales" },
      { href: routes.condos, label: "Condomínios", icon: "Building", feature: "condos" },
      { href: routes.whatsapp, label: "WhatsApp", icon: "MessageCircle", feature: "whatsapp" },
    ],
  },
  {
    label: "Crescimento",
    entries: [
      { href: routes.crm, label: "CRM", icon: "Users", feature: "crm" },
      { href: routes.finance, label: "Finanças", icon: "Wallet", feature: "finance" },
    ],
  },
  {
    label: "Administração",
    entries: [{ href: routes.admin, label: "Configurações", icon: "Settings", feature: "admin" }],
  },
];

export const PRIMARY_NAV: NavEntry[] = [
  { href: routes.dashboard, label: "Início", icon: "LayoutDashboard", feature: "clients" },
  { href: routes.properties, label: "Imóveis", icon: "Building2", feature: "properties" },
  { href: routes.finance, label: "Finanças", icon: "Wallet", feature: "finance" },
  { href: routes.calendar, label: "Agenda", icon: "CalendarDays", feature: "calendar" },
  { href: routes.crm, label: "CRM", icon: "Users", feature: "crm" },
  { href: routes.assistant, label: "IA", icon: "Sparkles", feature: "assistant" },
];

// Secondary nav (top bar menu / drawer).
export const SECONDARY_NAV: NavEntry[] = [
  { href: routes.clients, label: "Clientes", icon: "Contact", feature: "clients" },
      { href: routes.calendar, label: "Calendario", icon: "CalendarDays", feature: "calendar" },
  { href: routes.rentals, label: "Locação", icon: "KeyRound", feature: "rentals" },
  { href: routes.sales, label: "Vendas", icon: "Handshake", feature: "sales" },
  { href: routes.condos, label: "Condomínios", icon: "Building", feature: "condos" },
  { href: routes.whatsapp, label: "WhatsApp", icon: "MessageCircle", feature: "whatsapp" },
  { href: routes.admin, label: "Administração", icon: "Settings", feature: "admin" },
];

