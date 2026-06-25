// Server-component helpers shared by domain pages.
import { getPrincipal } from "@/lib/session";
import { can as canFn, filterAllowed as filterAllowedFn } from "@/lib/permissions/enforce";
import type { Principal } from "@/lib/permissions/enforce";

export { filterAllowedFn as filterAllowed };

// The current principal (for scope filtering and gating inside pages). Pages call
// this after guardPage, which already redirects unauthenticated users, so a null
// here means no session — return a safe empty principal that sees nothing.
export async function getPrincipalCan(): Promise<Principal> {
  const p = await getPrincipal();
  return p ?? { id: "", role: "viewer", teamMemberIds: [] };
}

export const can = canFn;
