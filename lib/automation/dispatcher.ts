import type { RepoContext } from "@/lib/repositories/base";
import type { AutomationRule } from "@/lib/types/domain";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { executeAutomationAction } from "./executor";
import { chargeOffsetRunAt } from "./schedule";
import { auditRepository } from "@/lib/repositories/audit.repository";

function runKey(ruleId: string, scheduledFor: string, suffix = "default"): string {
  return `${ruleId}:${scheduledFor}:${suffix}`;
}

async function executeRule(ctx: RepoContext, rule: AutomationRule, scheduledFor: string, suffix?: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const idempotencyKey = runKey(rule.id, scheduledFor, suffix);
  if (await automationRepository.findRunByKey(ctx, idempotencyKey)) return { ok: true, skipped: true };

  const run = await automationRepository.createRun(ctx, {
    ruleId: rule.id,
    scheduledFor,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "skipped",
    idempotencyKey,
    actionKind: rule.action.kind,
    payload: rule.action.payload,
    result: null,
    error: null,
  });

  try {
    const result = await executeAutomationAction(ctx, rule.action);
    await automationRepository.updateRun(ctx, run.id, {
      status: "success",
      finishedAt: new Date().toISOString(),
      result,
      error: null,
    });
    await auditRepository.log(ctx, {
      userId: null,
      action: "automation_run",
      entityType: "automation_rule",
      entityId: rule.id,
      payloadBefore: null,
      payloadAfter: { scheduledFor, action: rule.action.kind, result },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    await automationRepository.updateRun(ctx, run.id, {
      status: "error",
      finishedAt: new Date().toISOString(),
      error: message,
    });
    return { ok: false, error: message };
  }
}

export async function dispatchDueAutomations(ctx: RepoContext, now = new Date()) {
  const dueRules = await automationRepository.listDue(ctx, now);
  const results: Array<{ ruleId: string; ok: boolean; skipped?: boolean; error?: string }> = [];

  for (const rule of dueRules.filter((item) => item.trigger.kind !== "charge_due")) {
    const scheduledFor = rule.nextRunAt ?? now.toISOString();
    const result = await executeRule(ctx, rule, scheduledFor);
    results.push({ ruleId: rule.id, ...result });
    await automationRepository.completeRuleRun(ctx, rule, scheduledFor);
  }

  const chargeRules = (await automationRepository.listRules(ctx)).filter((rule) => rule.status === "active" && rule.trigger.kind === "charge_due");
  if (chargeRules.length) {
    const charges = await billingRepository.list(ctx);
    for (const rule of chargeRules) {
      const offset = rule.trigger.chargeOffsetDays ?? 0;
      for (const charge of charges) {
        if (charge.effectiveStatus === "paga" || charge.status === "cancelada") continue;
        const scheduledFor = chargeOffsetRunAt(charge.dueDate, offset, rule.trigger.localTime);
        if (scheduledFor > now.toISOString()) continue;
        const action = rule.action.targetId ? rule.action : { ...rule.action, targetId: charge.id };
        const result = await executeRule(ctx, { ...rule, action }, scheduledFor, charge.id);
        results.push({ ruleId: rule.id, ...result });
      }
      await automationRepository.updateRule(ctx, rule.id, { lastRunAt: now.toISOString() });
    }
  }

  return results;
}
