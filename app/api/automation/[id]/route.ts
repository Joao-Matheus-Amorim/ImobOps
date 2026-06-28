import { NextResponse } from "next/server";
import { requireContext } from "@/lib/api-auth";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { automationRulePatchSchema } from "@/lib/automation/schema";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { validateAutomationAction } from "@/lib/automation/executor";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const before = await automationRepository.getRule(auth.ctx, params.id);
  if (!before) return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  const json = await request.json().catch(() => null);
  const parsed = automationRulePatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido.", issues: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.action) {
    try {
      validateAutomationAction(parsed.data.action);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Dados da ação inválidos." }, { status: 400 });
    }
  }
  const rule = await automationRepository.updateRule(auth.ctx, params.id, parsed.data);
  await auditRepository.log(auth.ctx, {
    userId: auth.userId,
    action: "edit",
    entityType: "automation_rule",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: rule as unknown as Record<string, unknown>,
  });
  return NextResponse.json({ ok: true, rule });
}
