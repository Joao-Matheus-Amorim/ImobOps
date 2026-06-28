import { S } from "@/lib/status";
import type { AutomationRule, AutomationRun, AutomationStatus } from "@/lib/types/domain";
import type { RepoContext } from "./base";
import { Collection } from "./collection";
import { nextRunAt } from "@/lib/automation/schedule";

const rules = new Collection<AutomationRule>("automationRules", "automation_rules");
const runs = new Collection<AutomationRun>("automationRuns", "automation_runs");

export const automationRepository = {
  async listRules(ctx: RepoContext): Promise<AutomationRule[]> {
    const rows = await rules.list(ctx);
    return rows.sort((a, b) => (a.nextRunAt ?? "9999").localeCompare(b.nextRunAt ?? "9999"));
  },

  getRule(ctx: RepoContext, id: string): Promise<AutomationRule | null> {
    return rules.find(ctx, id);
  },

  async createRule(
    ctx: RepoContext,
    data: Omit<AutomationRule, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy" | "nextRunAt" | "lastRunAt" | "timezone">,
  ): Promise<AutomationRule> {
    return rules.create(ctx, {
      ...data,
      timezone: "America/Sao_Paulo",
      nextRunAt: data.status === S.ACTIVE ? nextRunAt(data.trigger) : null,
      lastRunAt: null,
    });
  },

  async updateRule(ctx: RepoContext, id: string, patch: Partial<AutomationRule>): Promise<AutomationRule | null> {
    const current = await rules.find(ctx, id);
    if (!current) return null;
    const merged = { ...current, ...patch, timezone: "America/Sao_Paulo" as const };
    const shouldRecompute = patch.trigger || patch.status;
    return rules.update(ctx, id, {
      ...patch,
      timezone: "America/Sao_Paulo",
      nextRunAt: shouldRecompute && merged.status === S.ACTIVE ? nextRunAt(merged.trigger) : patch.nextRunAt,
    });
  },

  async setStatus(ctx: RepoContext, id: string, status: AutomationStatus): Promise<AutomationRule | null> {
    const current = await rules.find(ctx, id);
    if (!current) return null;
    return rules.update(ctx, id, {
      status,
      nextRunAt: status === S.ACTIVE ? nextRunAt(current.trigger) : null,
    });
  },

  async listDue(ctx: RepoContext, now = new Date()): Promise<AutomationRule[]> {
    const rows = await rules.list(ctx, (rule) => rule.status === S.ACTIVE && Boolean(rule.nextRunAt) && rule.nextRunAt! <= now.toISOString());
    return rows.sort((a, b) => (a.nextRunAt ?? "").localeCompare(b.nextRunAt ?? ""));
  },

  async completeRuleRun(ctx: RepoContext, rule: AutomationRule, _scheduledFor: string): Promise<void> {
    await rules.update(ctx, rule.id, {
      lastRunAt: new Date().toISOString(),
      nextRunAt: rule.trigger.kind === "once" ? null : nextRunAt(rule.trigger, new Date(Date.now() + 1000)),
      status: rule.trigger.kind === "once" ? S.PAUSED : rule.status,
    });
  },

  async findRunByKey(ctx: RepoContext, idempotencyKey: string): Promise<AutomationRun | null> {
    const rows = await runs.list(ctx, (run) => run.idempotencyKey === idempotencyKey);
    return rows.at(0) ?? null;
  },

  createRun(ctx: RepoContext, data: Omit<AutomationRun, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): Promise<AutomationRun> {
    return runs.create(ctx, data);
  },

  updateRun(ctx: RepoContext, id: string, patch: Partial<AutomationRun>): Promise<AutomationRun | null> {
    return runs.update(ctx, id, patch);
  },

  async listRuns(ctx: RepoContext, ruleId?: string): Promise<AutomationRun[]> {
    const rows = await runs.list(ctx, (run) => (ruleId ? run.ruleId === ruleId : true));
    return rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  },
};
