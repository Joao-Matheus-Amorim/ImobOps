// Resolves the current principal. In mock mode it reads a role hint from a cookie
// (set by the login page) and defaults to the demo admin. With Supabase configured,
// it reads the authenticated user + their profile.

import { cookies } from "next/headers";
import type { Principal } from "@/lib/permissions/enforce";
import type { Role } from "@/lib/types/permissions";
import { ROLES } from "@/lib/types/permissions";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { store } from "@/lib/mock-data";

export const ROLE_COOKIE = "imobops_role";

export interface SessionUser extends Principal {
  tenancyId: string;
  displayName: string;
  email: string;
}

// Map a role to the demo user id used by mock data ownership.
function demoUserIdForRole(role: Role): string {
  if (role === "broker") return DEMO_USERS.broker;
  if (role === "finance") return DEMO_USERS.finance;
  return DEMO_USERS.admin;
}

// Read the current session (mock mode: cookie-driven role switch).
export function getSessionUser(): SessionUser {
  const cookieRole = cookies().get(ROLE_COOKIE)?.value as Role | undefined;
  const role: Role = cookieRole && ROLES.includes(cookieRole) ? cookieRole : "admin";
  const userId = demoUserIdForRole(role);
  const profile = store.users.find((u) => u.id === userId);

  // team = all users sharing the tenancy except the user (simple demo model).
  const teamMemberIds = store.users
    .filter((u) => u.id !== userId)
    .map((u) => u.id);

  return {
    id: userId,
    role,
    teamMemberIds,
    tenancyId: DEMO_TENANCY_ID,
    displayName: profile?.displayName ?? "Usuário",
    email: profile?.email ?? "",
  };
}

// Convenience: the bare Principal for permission checks.
export function getPrincipal(): Principal {
  const u = getSessionUser();
  return { id: u.id, role: u.role, teamMemberIds: u.teamMemberIds };
}
