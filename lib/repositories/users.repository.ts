// Users/team repository. Reads from Supabase (RLS-scoped to the caller's
// tenancy) when configured, or the mock store otherwise — same as every other
// repository. Replaces direct `store.users` access in pages and the triage bot.
import type { User } from "@/lib/types/domain";
import type { Role } from "@/lib/types/permissions";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const users = new Collection<User>("users", "users");

export const usersRepository = {
  // All users in the caller's tenancy.
  list(ctx: RepoContext): Promise<User[]> {
    return users.list(ctx);
  },

  // Active users with a given role (e.g. brokers for lead assignment).
  async listByRole(ctx: RepoContext, role: Role): Promise<User[]> {
    const rows = await users.list(ctx, (u) => u.role === role && u.active);
    return rows;
  },

  find(ctx: RepoContext, id: string): Promise<User | null> {
    return users.find(ctx, id);
  },

  // Lookup map id -> displayName, handy for resolving names in lists.
  async displayNames(ctx: RepoContext): Promise<Map<string, string>> {
    const rows = await users.list(ctx);
    return new Map(rows.map((u) => [u.id, u.displayName]));
  },

  // Create a team member profile (no auth account — they can't log in yet).
  create(
    ctx: RepoContext,
    data: Omit<User, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<User> {
    return users.create(ctx, data);
  },
};
