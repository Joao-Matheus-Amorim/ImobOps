// Permission model — Role defines the default, Admin defines the real permission.
// Permission always beats role. Three data scopes: own | team | all.

export type Role =
  | "admin"
  | "manager"
  | "broker"
  | "finance"
  | "condo_admin"
  | "viewer";

export const ROLES: Role[] = [
  "admin",
  "manager",
  "broker",
  "finance",
  "condo_admin",
  "viewer",
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  manager: "Gerente",
  broker: "Corretor",
  finance: "Financeiro",
  condo_admin: "Síndico/Condomínio",
  viewer: "Visualizador",
};

// Data visibility scope.
export type Scope = "own" | "team" | "all";

export const SCOPE_LABELS: Record<Scope, string> = {
  own: "Próprios",
  team: "Da equipe",
  all: "Todos",
};

// Actions a user can perform on a feature.
export type Action = "view" | "create" | "edit" | "delete";

export const ACTIONS: Action[] = ["view", "create", "edit", "delete"];

// Feature keys map to business areas / sub-areas used by the UI and API.
export type FeatureKey =
  | "clients"
  | "properties"
  | "rentals"
  | "rentals.installments"
  | "sales"
  | "condos"
  | "condo_fees"
  | "condo_expenses"
  | "condo_meetings"
  | "finance"
  | "repasses"
  | "commissions"
  | "crm"
  | "whatsapp"
  | "assistant"
  | "admin";

export const FEATURE_KEYS: FeatureKey[] = [
  "clients",
  "properties",
  "rentals",
  "rentals.installments",
  "sales",
  "condos",
  "condo_fees",
  "condo_expenses",
  "condo_meetings",
  "finance",
  "repasses",
  "commissions",
  "crm",
  "whatsapp",
  "assistant",
  "admin",
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  clients: "Clientes",
  properties: "Imóveis",
  rentals: "Locação",
  "rentals.installments": "Parcelas de locação",
  sales: "Vendas",
  condos: "Condomínios",
  condo_fees: "Taxas de condomínio",
  condo_expenses: "Despesas de condomínio",
  condo_meetings: "Assembleias",
  finance: "Financeiro",
  repasses: "Repasses",
  commissions: "Comissões",
  crm: "CRM",
  whatsapp: "WhatsApp",
  assistant: "Assistente IA",
  admin: "Administração",
};

// A single permission entry for a feature.
export interface FeaturePermission {
  feature: FeatureKey;
  actions: Action[];
  scope: Scope;
  // Optional explicit member ids the user may also see (for team scope refinement).
  allowedMemberIds?: string[];
}

// Per-user override persisted in user_feature_permissions.
export interface UserFeaturePermission {
  userId: string;
  featureKey: FeatureKey;
  actions: Action[];
  scope: Scope;
  allowedMemberIds?: string[];
}

// Resolved permission set for an authenticated user.
export interface PermissionSet {
  role: Role;
  permissions: FeaturePermission[];
}
