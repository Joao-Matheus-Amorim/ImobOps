// Centralized route map. Keep in sync with app/ folder.
import type { FeatureKey } from "./types/permissions";
import { isSimpleRealEstateMode } from "./constants";

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
  reports: "/reports",
  documents: "/documents",
  crm: "/crm",
  whatsapp: "/whatsapp",
  assistant: "/assistant",
  admin: "/admin",
} as const;

export interface NavEntry {
  href: string;
  label: string;
  icon: string;
  feature: FeatureKey;
}

export interface NavGroup {
  label: string;
  entries: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operacao",
    entries: [
      { href: routes.dashboard, label: "Dashboard", icon: "LayoutDashboard", feature: "clients" },
      { href: routes.assistant, label: "Assistente IA", icon: "Sparkles", feature: "assistant" },
      { href: routes.clients, label: "Clientes", icon: "Contact", feature: "clients" },
      { href: routes.calendar, label: "Calendario", icon: "CalendarDays", feature: "calendar" },
      { href: routes.reports, label: "Relatorios", icon: "BarChart3", feature: "reports" },
      { href: routes.documents, label: "Documentos", icon: "FileStack", feature: "documents" },
      { href: routes.properties, label: "Imoveis", icon: "Building2", feature: "properties" },
      { href: routes.rentals, label: "Locacao", icon: "KeyRound", feature: "rentals" },
      { href: routes.sales, label: "Vendas", icon: "Handshake", feature: "sales" },
      { href: routes.condos, label: "Condominios", icon: "Building", feature: "condos" },
      { href: routes.whatsapp, label: "WhatsApp", icon: "MessageCircle", feature: "whatsapp" },
    ],
  },
  {
    label: "Crescimento",
    entries: [
      { href: routes.crm, label: "CRM", icon: "Users", feature: "crm" },
      { href: routes.finance, label: "Financas", icon: "Wallet", feature: "finance" },
    ],
  },
  {
    label: "Administracao",
    entries: [{ href: routes.admin, label: "Configuracoes", icon: "Settings", feature: "admin" }],
  },
];

export const PRIMARY_NAV: NavEntry[] = [
  { href: routes.dashboard, label: "Inicio", icon: "LayoutDashboard", feature: "clients" },
  { href: routes.rentals, label: "Locacao", icon: "KeyRound", feature: "rentals" },
  { href: routes.properties, label: "Imoveis", icon: "Building2", feature: "properties" },
  { href: routes.whatsapp, label: "WhatsApp", icon: "MessageCircle", feature: "whatsapp" },
  { href: routes.finance, label: "Financas", icon: "Wallet", feature: "finance" },
  { href: routes.calendar, label: "Agenda", icon: "CalendarDays", feature: "calendar" },
];

export const SECONDARY_NAV: NavEntry[] = [
  { href: routes.clients, label: "Clientes", icon: "Contact", feature: "clients" },
  { href: routes.calendar, label: "Calendario", icon: "CalendarDays", feature: "calendar" },
  { href: routes.reports, label: "Relatorios", icon: "BarChart3", feature: "reports" },
  { href: routes.documents, label: "Documentos", icon: "FileStack", feature: "documents" },
  { href: routes.rentals, label: "Locacao", icon: "KeyRound", feature: "rentals" },
  { href: routes.sales, label: "Vendas", icon: "Handshake", feature: "sales" },
  { href: routes.condos, label: "Condominios", icon: "Building", feature: "condos" },
  { href: routes.whatsapp, label: "WhatsApp", icon: "MessageCircle", feature: "whatsapp" },
  { href: routes.admin, label: "Administracao", icon: "Settings", feature: "admin" },
];

const SIMPLE_HIDDEN_FEATURES = new Set<FeatureKey>(["condos", "condo_fees", "condo_expenses", "condo_meetings"]);

export function visibleNavEntries(entries: NavEntry[]): NavEntry[] {
  if (!isSimpleRealEstateMode()) return entries;
  return entries.filter((entry) => !SIMPLE_HIDDEN_FEATURES.has(entry.feature));
}

export function visibleNavGroups(groups: NavGroup[]): NavGroup[] {
  if (!isSimpleRealEstateMode()) return groups;
  return groups
    .map((group) => ({
      ...group,
      entries: visibleNavEntries(group.entries),
    }))
    .filter((group) => group.entries.length > 0);
}
