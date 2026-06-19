// Dry-run / confirmation logic. Write tools must first return a preview (dry_run),
// then execute only when a second turn arrives with confirm: true. Reads run direct.
import type { ToolDefinition, ToolContext, ToolResult } from "@/lib/types/ai";

export interface RunOptions {
  confirm: boolean;
}

// Execute a tool, honoring the dry-run rule for writes.
export async function runTool(
  tool: ToolDefinition,
  params: unknown,
  ctx: ToolContext,
  options: RunOptions,
  callId: string,
): Promise<ToolResult> {
  // Validate params with the tool's Zod schema.
  const parsed = tool.schema.safeParse(params);
  if (!parsed.success) {
    return {
      callId,
      toolName: tool.name,
      dryRun: false,
      confirmed: false,
      ok: false,
      error: `Parâmetros inválidos: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
    };
  }

  // Reads execute directly.
  if (tool.effect === "read") {
    const data = await tool.run(parsed.data, ctx);
    return { callId, toolName: tool.name, dryRun: false, confirmed: true, ok: true, data };
  }

  // Writes: dry-run unless confirmed.
  if (!options.confirm) {
    const preview = tool.preview
      ? await tool.preview(parsed.data, ctx)
      : `Esta ação irá ${tool.action} em ${tool.feature}. Confirme para executar.`;
    return {
      callId,
      toolName: tool.name,
      dryRun: true,
      confirmed: false,
      ok: true,
      preview,
    };
  }

  // Confirmed write.
  const data = await tool.run(parsed.data, ctx);
  return { callId, toolName: tool.name, dryRun: false, confirmed: true, ok: true, data };
}
