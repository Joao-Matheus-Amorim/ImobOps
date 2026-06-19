// AI tool guard. Two layers:
//  1. Allowlist by role — MVP grants tools to `admin` only; structure supports
//     opening others later.
//  2. Permission check — the tool's feature/action must be allowed for the user.
// The actual data access still runs under the user's RLS (Supabase) or tenancy
// filter (mock), so this is defense-in-depth, not the only barrier.

import type { ToolDefinition, ToolContext } from "@/lib/types/ai";
import type { Principal } from "@/lib/permissions/enforce";
import { can } from "@/lib/permissions/enforce";

export class ToolDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolDeniedError";
  }
}

// MVP allowlist: only admin may invoke tools.
export const MVP_ALLOWED_ROLES = ["admin"] as const;

// Check whether a principal may invoke a tool. Throws ToolDeniedError otherwise.
export function assertToolAllowed(
  tool: ToolDefinition,
  principal: Principal,
): void {
  if (!tool.allowedRoles.includes(principal.role)) {
    throw new ToolDeniedError(
      `A tool "${tool.name}" não está liberada para o papel ${principal.role}.`,
    );
  }
  if (!can(principal, tool.feature, tool.action)) {
    throw new ToolDeniedError(
      `Permissão insuficiente para ${tool.action} em ${tool.feature}.`,
    );
  }
}

// Build the tool context passed to handlers.
export function toolContextFor(principal: Principal, tenancyId: string): ToolContext {
  return { userId: principal.id, tenancyId, role: principal.role };
}

// The subset of tools a principal is allowed to see/call (used to expose to the LLM).
export function allowedToolsFor(
  tools: ToolDefinition[],
  principal: Principal,
): ToolDefinition[] {
  return tools.filter((t) => {
    try {
      assertToolAllowed(t, principal);
      return true;
    } catch {
      return false;
    }
  });
}
