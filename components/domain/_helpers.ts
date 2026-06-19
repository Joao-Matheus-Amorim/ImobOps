// Server-component helpers shared by domain pages.
import { getPrincipal } from "@/lib/session";
import { can as canFn, filterAllowed as filterAllowedFn } from "@/lib/permissions/enforce";
import type { Principal } from "@/lib/permissions/enforce";

export { filterAllowedFn as filterAllowed };

// The current principal (for scope filtering and gating inside pages).
export function getPrincipalCan(): Principal {
  return getPrincipal();
}

export const can = canFn;
