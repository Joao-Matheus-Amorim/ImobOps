// Helper to declare tools with sane defaults (MVP allowlist = admin only).
import type { z } from "zod";
import type { ToolDefinition, ToolContext, ToolEffect } from "@/lib/types/ai";
import type { FeatureKey, Action, Role } from "@/lib/types/permissions";
import type { RepoContext } from "@/lib/repositories/base";

const DEFAULT_ALLOWED: Role[] = ["admin"];

export function repoCtx(ctx: ToolContext): RepoContext {
  return { tenancyId: ctx.tenancyId, userId: ctx.userId };
}

export function defineTool<TParams>(def: {
  name: string;
  description: string;
  effect: ToolEffect;
  feature: FeatureKey;
  action: Action;
  schema: z.ZodType<TParams>;
  allowedRoles?: Role[];
  run: (params: TParams, ctx: ToolContext) => Promise<unknown>;
  preview?: (params: TParams, ctx: ToolContext) => Promise<string>;
}): ToolDefinition {
  return {
    ...def,
    allowedRoles: def.allowedRoles ?? DEFAULT_ALLOWED,
  } as ToolDefinition;
}
