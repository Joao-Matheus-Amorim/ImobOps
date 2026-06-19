// Scope helpers: decide whether a record is visible under own | team | all.

import type { Scope } from "@/lib/types/permissions";

// Minimal shape a record needs to be scope-checked. ownerUserId may be null
// (unowned records are visible to team/all, and to own only if it's the user's).
export interface Ownable {
  ownerUserId?: string | null;
  assignedToUserId?: string | null;
  brokerUserId?: string | null;
  managerUserId?: string | null;
}

// Resolve the effective owner id of a record across the various owner columns.
export function ownerOf(record: Ownable): string | null {
  return (
    record.ownerUserId ??
    record.assignedToUserId ??
    record.brokerUserId ??
    record.managerUserId ??
    null
  );
}

// Returns true if a user with `scope` may see a record owned by `recordOwnerId`,
// given the user's id and the ids of their team members.
export function isWithinScope(
  scope: Scope,
  userId: string,
  teamMemberIds: string[],
  record: Ownable,
): boolean {
  if (scope === "all") return true;

  const owner = ownerOf(record);
  if (scope === "own") {
    return owner === userId;
  }
  // team
  if (owner === userId) return true;
  return owner !== null && teamMemberIds.includes(owner);
}

// Filter a list of ownable records to those within the given scope.
export function filterByScope<T extends Ownable>(
  records: T[],
  scope: Scope,
  userId: string,
  teamMemberIds: string[],
): T[] {
  if (scope === "all") return records;
  return records.filter((r) => isWithinScope(scope, userId, teamMemberIds, r));
}
