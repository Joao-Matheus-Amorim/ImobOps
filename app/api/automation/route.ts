import { NextResponse } from "next/server";
import { requireContext } from "@/lib/api-auth";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { automationRuleInputSchema } from "@/lib/automation/schema";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { validateAutomationAction } from "@/lib/automation/executor";

export async function GET(request: Request) {
  const auth = await requireContext(request, { limit: 120 });
  if ("error" in auth) return auth.error;
  const [rules, runs] = await Promise.all([
    automationRepository.listRules(auth.ctx),
    automationRepository.listRuns(auth.ctx),
  ]);
  return NextResponse.json({ ok: true, rules, runs: runs.slice(0, 50) });
}

export async function POST(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const json = await request.json().catch(() => null);
  const parsed = automationRuleInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido.", issues: parsed.error.flatten() }, { status: 400 });
  }
  try {
    validateAutomationAction(parsed.data.action);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dados da ação inválidos." }, { status: 400 });
  }
  const rule = await automationRepository.createRule(auth.ctx, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    status: parsed.data.status,
    trigger: parsed.data.trigger,
    action: parsed.data.action,
  });
  await auditRepository.log(auth.ctx, {
    userId: auth.userId,
    action: "create",
    entityType: "automation_rule",
    entityId: rule.id,
    payloadBefore: null,
    payloadAfter: rule as unknown as Record<string, unknown>,
  });
  return NextResponse.json({ ok: true, rule });
}
