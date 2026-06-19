// Permission enforcement. Resolves role defaults + user overrides, then exposes
// `can()` (UI gating) and `enforceScope()` (server-side guard before repositories).

import type {
  Action,
  FeatureKey,
  FeaturePermission,
  PermissionSet,
  Role,
  Scope,
  UserFeaturePermission,
} from "@/lib/types/permissions";
import { DEFAULT_PERMISSIONS } from "./rules";
import { isWithinScope, type Ownable } from "./scope";

// An authenticated principal used by the permission layer.
export interface Principal {
  id: string;
  role: Role;
  teamMemberIds: string[];
  // Per-user overrides loaded from user_feature_permissions.
  overrides?: UserFeaturePermission[];
}

// Resolve the effective permission set for a principal.
// Overrides win over role defaults (permission beats role).
export function resolvePermissions(principal: Principal): PermissionSet {
  const base = DEFAULT_PERMISSIONS[principal.role];
  const byFeature = new Map<FeatureKey, FeaturePermission>();
  for (const p of base) byFeature.set(p.feature, { ...p });

  for (const o of principal.overrides ?? []) {
    byFeature.set(o.featureKey, {
      feature: o.featureKey,
      actions: o.actions,
      scope: o.scope,
      allowedMemberIds: o.allowedMemberIds,
    });
  }

  return { role: principal.role, permissions: [...byFeature.values()] };
}

// Find the resolved permission for a feature.
export function permissionFor(
  principal: Principal,
  feature: FeatureKey,
): FeaturePermission | undefined {
  return resolvePermissions(principal).permissions.find(
    (p) => p.feature === feature,
  );
}

// UI gate: can this principal perform `action` on `feature` at all?
export function can(
  principal: Principal,
  feature: FeatureKey,
  action: Action = "view",
): boolean {
  const p = permissionFor(principal, feature);
  return Boolean(p && p.actions.includes(action));
}

// The scope a principal has for a feature (defaults to most restrictive "own").
export function scopeFor(principal: Principal, feature: FeatureKey): Scope {
  return permissionFor(principal, feature)?.scope ?? "own";
}

export class PermissionError extends Error {
  constructor(
    public feature: FeatureKey,
    public action: Action,
  ) {
    super(`Permissão negada: ${action} em ${feature}`);
    this.name = "PermissionError";
  }
}

// Server-side guard. Throws PermissionError if the action is not allowed.
// When a record is supplied, also enforces the data scope.
export function enforceScope(
  principal: Principal,
  feature: FeatureKey,
  action: Action,
  record?: Ownable,
): void {
  if (!can(principal, feature, action)) {
    throw new PermissionError(feature, action);
  }
  if (record) {
    const scope = scopeFor(principal, feature);
    const teamIds = [
      ...principal.teamMemberIds,
      ...(permissionFor(principal, feature)?.allowedMemberIds ?? []),
    ];
    if (!isWithinScope(scope, principal.id, teamIds, record)) {
      throw new PermissionError(feature, action);
    }
  }
}

// Non-throwing variant for filtering. Returns the allowed subset.
export function filterAllowed<T extends Ownable>(
  principal: Principal,
  feature: FeatureKey,
  records: T[],
): T[] {
  if (!can(principal, feature, "view")) return [];
  const scope = scopeFor(principal, feature);
  if (scope === "all") return records;
  const teamIds = [
    ...principal.teamMemberIds,
    ...(permissionFor(principal, feature)?.allowedMemberIds ?? []),
  ];
  return records.filter((r) =>
    isWithinScope(scope, principal.id, teamIds, r),
  );
}
