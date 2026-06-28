// Records every AI tool execution into ai_actions (append-only).
import type { ToolContext, ToolResult } from "@/lib/types/ai";
import { aiActionsRepository } from "@/lib/repositories/audit.repository";

export function recordAiAction(
  ctx: ToolContext,
  prompt: string,
  toolName: string,
  toolParams: Record<string, unknown>,
  result: ToolResult,
): void {
  void aiActionsRepository.record(
    { tenancyId: ctx.tenancyId, userId: ctx.userId },
    {
      userId: ctx.userId,
      prompt,
      toolName,
      toolParams,
      dryRun: result.dryRun,
      confirmed: result.confirmed,
      result: result.ok ? ((result.data as Record<string, unknown>) ?? { preview: result.preview ?? null }) : null,
      error: result.error ?? null,
    },
  ).catch((error: unknown) => {
    console.error("ai_actions.record failed", error);
  });
}
