// Resolves the current session. With Supabase configured it reads the authenticated
// auth user and their profile row (users) — tenancy_id + role come from the JWT
// claims injected by the access-token hook, with the users row as the source of
// truth for ownership/team. Without Supabase it falls back to the cookie-driven
// mock session (role switcher) used in demo mode.

import { cookies } from "next/headers";
import type { Principal } from "@/lib/permissions/enforce";
import type { Role } from "@/lib/types/permissions";
import { ROLES } from "@/lib/types/permissions";
import {
  DEMO_TENANCY_ID,
  DEMO_USERS,
  isClientPreviewMode,
  isSupabaseConfigured,
} from "@/lib/constants";
import { store } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

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

// Mock session (demo mode): cookie-driven role switch over the seeded users.
function mockSessionUser(): SessionUser {
  const cookieRole = cookies().get(ROLE_COOKIE)?.value as Role | undefined;
  const role: Role = isClientPreviewMode()
    ? "admin"
    : cookieRole && ROLES.includes(cookieRole)
      ? cookieRole
      : "admin";
  const userId = demoUserIdForRole(role);
  const profile = store.users.find((u) => u.id === userId);
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

// Resolve the current session user. Async because Supabase auth is async.
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return mockSessionUser();

  const supabase = createClient();
  if (!supabase) return mockSessionUser();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // not authenticated → caller redirects to login

  // Profile row (RLS-scoped to the user's tenancy). Source of truth for team.
  const { data: profile } = await supabase
    .from("users")
    .select("id, role, display_name, email, tenancy_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) return null; // authenticated but no app profile → treat as no access

  const { data: team } = await supabase
    .from("users")
    .select("id")
    .neq("id", profile.id);

  return {
    id: profile.id,
    role: profile.role as Role,
    teamMemberIds: (team ?? []).map((t) => t.id),
    tenancyId: profile.tenancy_id,
    displayName: profile.display_name,
    email: profile.email,
  };
}

// Convenience: the bare Principal for permission checks.
export async function getPrincipal(): Promise<Principal | null> {
  const u = await getSessionUser();
  return u ? { id: u.id, role: u.role, teamMemberIds: u.teamMemberIds } : null;
}
