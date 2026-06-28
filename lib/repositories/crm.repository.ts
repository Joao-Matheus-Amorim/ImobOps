import type { CrmLead, CrmActivity, FunnelStage } from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const leads = new Collection<CrmLead>("leads", "crm_leads");
const activities = new Collection<CrmActivity>("activities", "crm_activities");

export const crmRepository = {
  async listLeads(ctx: RepoContext): Promise<CrmLead[]> {
    const rows = await leads.list(ctx);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getLead(ctx: RepoContext, id: string): Promise<CrmLead | null> {
    return leads.find(ctx, id);
  },

  createLead(
    ctx: RepoContext,
    data: Omit<CrmLead, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<CrmLead> {
    return leads.create(ctx, data);
  },

  updateLead(ctx: RepoContext, id: string, patch: Partial<CrmLead>): Promise<CrmLead | null> {
    return leads.update(ctx, id, patch);
  },

  assignLead(ctx: RepoContext, id: string, userId: string): Promise<CrmLead | null> {
    return leads.update(ctx, id, { assignedToUserId: userId });
  },

  moveStage(
    ctx: RepoContext,
    id: string,
    stage: FunnelStage,
    lostReason?: string,
  ): Promise<CrmLead | null> {
    return leads.update(ctx, id, {
      funnelStage: stage,
      lostReason: stage === "fechado_perdido" ? lostReason ?? null : null,
    });
  },

  // --- Activities ---

  async listActivities(ctx: RepoContext, leadId?: string): Promise<CrmActivity[]> {
    const rows = await activities.list(ctx, (a) => (leadId ? a.leadId === leadId : true));
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  logActivity(
    ctx: RepoContext,
    data: Omit<CrmActivity, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<CrmActivity> {
    return activities.create(ctx, data);
  },

  updateActivity(ctx: RepoContext, id: string, patch: Partial<CrmActivity>): Promise<CrmActivity | null> {
    return activities.update(ctx, id, patch);
  },

  async scheduleVisit(
    ctx: RepoContext,
    leadId: string,
    scheduledAt: string,
    description: string,
  ): Promise<CrmActivity> {
    const activity = await activities.create(ctx, {
      leadId,
      kind: "visita",
      description,
      scheduledAt,
      doneAt: null,
      byUserId: ctx.userId,
    });
    await leads.update(ctx, leadId, { funnelStage: "visita_agendada" });
    return activity;
  },
};
