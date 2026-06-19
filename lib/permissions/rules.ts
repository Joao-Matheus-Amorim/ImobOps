// Default permissions per role. "Role defines the default; Admin defines the real
// permission; permission always beats role." These are only the starting point —
// resolved permissions apply user overrides on top (see enforce.ts).

import type {
  Action,
  FeatureKey,
  FeaturePermission,
  Role,
  Scope,
} from "@/lib/types/permissions";
import { FEATURE_KEYS } from "@/lib/types/permissions";

const ALL_ACTIONS: Action[] = ["view", "create", "edit", "delete"];
const VIEW_ONLY: Action[] = ["view"];

function perm(
  feature: FeatureKey,
  actions: Action[],
  scope: Scope,
): FeaturePermission {
  return { feature, actions, scope };
}

// Build a permission set granting `actions`/`scope` on every feature.
function everything(actions: Action[], scope: Scope): FeaturePermission[] {
  return FEATURE_KEYS.map((f) => perm(f, actions, scope));
}

export const DEFAULT_PERMISSIONS: Record<Role, FeaturePermission[]> = {
  // admin → all on everything
  admin: everything(ALL_ACTIONS, "all"),

  // manager → all on CRM, sales, rentals; view on condos
  manager: [
    perm("crm", ALL_ACTIONS, "all"),
    perm("sales", ALL_ACTIONS, "all"),
    perm("rentals", ALL_ACTIONS, "all"),
    perm("rentals.installments", ALL_ACTIONS, "all"),
    perm("clients", ALL_ACTIONS, "all"),
    perm("properties", ALL_ACTIONS, "all"),
    perm("finance", VIEW_ONLY, "all"),
    perm("commissions", ALL_ACTIONS, "all"),
    perm("repasses", VIEW_ONLY, "all"),
    perm("condos", VIEW_ONLY, "all"),
    perm("condo_fees", VIEW_ONLY, "all"),
    perm("condo_expenses", VIEW_ONLY, "all"),
    perm("condo_meetings", VIEW_ONLY, "all"),
    perm("whatsapp", ALL_ACTIONS, "all"),
    perm("assistant", VIEW_ONLY, "all"),
  ],

  // broker → own on clients, properties, sales, crm; view on rentals
  broker: [
    perm("clients", ALL_ACTIONS, "own"),
    perm("properties", ALL_ACTIONS, "own"),
    perm("sales", ALL_ACTIONS, "own"),
    perm("crm", ALL_ACTIONS, "own"),
    perm("rentals", VIEW_ONLY, "own"),
    perm("whatsapp", ALL_ACTIONS, "own"),
  ],

  // finance → all on finance and money-related areas; view on clients
  finance: [
    perm("finance", ALL_ACTIONS, "all"),
    perm("rentals", VIEW_ONLY, "all"),
    perm("rentals.installments", ALL_ACTIONS, "all"),
    perm("condo_fees", ALL_ACTIONS, "all"),
    perm("repasses", ALL_ACTIONS, "all"),
    perm("commissions", ALL_ACTIONS, "all"),
    perm("clients", VIEW_ONLY, "all"),
    perm("properties", VIEW_ONLY, "all"),
  ],

  // condo_admin → all on condos and condo sub-areas; view on clients
  condo_admin: [
    perm("condos", ALL_ACTIONS, "all"),
    perm("condo_fees", ALL_ACTIONS, "all"),
    perm("condo_expenses", ALL_ACTIONS, "all"),
    perm("condo_meetings", ALL_ACTIONS, "all"),
    perm("clients", VIEW_ONLY, "all"),
    perm("properties", VIEW_ONLY, "all"),
  ],

  // viewer → view on everything
  viewer: everything(VIEW_ONLY, "all"),
};

// Lookup the default permission for a role+feature, if any.
export function defaultPermissionFor(
  role: Role,
  feature: FeatureKey,
): FeaturePermission | undefined {
  return DEFAULT_PERMISSIONS[role].find((p) => p.feature === feature);
}
