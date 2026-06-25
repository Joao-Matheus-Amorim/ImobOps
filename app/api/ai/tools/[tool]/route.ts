// Server-side execution of a single AI tool. Called with the caller's session, so
// data access inherits the user's RLS / tenancy. Enforces the four AI rules:
//  1. RLS of the logged-in user (no service_role).
//  2. Writes require dry-run then confirm.
//  3. Every execution is audited in ai_actions.
//  4. Allowlist by role (MVP: admin only).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal } from "@/lib/session";
import { getSessionUser } from "@/lib/session";
import { getTool } from "@/lib/ai/tools/registry";
import { assertToolAllowed, toolContextFor, ToolDeniedError } from "@/lib/ai/guard";
import { runTool } from "@/lib/ai/confirm";
import { recordAiAction } from "@/lib/ai/audit";

const bodySchema = z.object({
  prompt: z.string().default(""),
  params: z.record(z.unknown()).default({}),
  confirm: z.boolean().default(false),
  callId: z.string().default("call"),
});

export async function POST(
  request: Request,
  { params }: { params: { tool: string } },
) {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) {
    return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
  }
  const tool = getTool(params.tool);
  if (!tool) {
    return NextResponse.json({ ok: false, error: "Tool não encontrada." }, { status: 404 });
  }

  // Rule 4: allowlist by role + permission check.
  try {
    assertToolAllowed(tool, principal);
  } catch (e) {
    if (e instanceof ToolDeniedError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 403 });
    }
    throw e;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Corpo inválido." }, { status: 400 });
  }
  const { prompt, params: toolParams, confirm, callId } = parsed.data;

  const ctx = toolContextFor(principal, user.tenancyId);

  // Rule 2: dry-run / confirm handled inside runTool.
  const result = await runTool(tool, toolParams, ctx, { confirm }, callId);

  // Rule 3: audit every execution (dry-run included).
  recordAiAction(ctx, prompt, tool.name, toolParams, result);

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
