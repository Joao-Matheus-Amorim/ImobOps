import { NextResponse } from "next/server";
import { requireContext } from "@/lib/api-auth";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { validateAutomationAction } from "@/lib/automation/executor";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request, { limit: 20 });
  if ("error" in auth) return auth.error;
  const rule = await automationRepository.getRule(auth.ctx, params.id);
  if (!rule) return NextResponse.json({ error: "Automação não encontrada." }, { status: 404 });
  try {
    const normalizedPayload = validateAutomationAction(rule.action);
    return NextResponse.json({ ok: true, simulated: true, result: { action: rule.action.kind, normalizedPayload } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha no teste." }, { status: 400 });
  }
}
