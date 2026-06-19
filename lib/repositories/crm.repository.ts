import type { CrmLead, CrmActivity, FunnelStage } from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";

const leads = new MockCollection<CrmLead>("leads");
const activities = new MockCollection<CrmActivity>("activities");

export const crmRepository = {
  listLeads(ctx: RepoContext): CrmLead[] {
    return leads.list(ctx).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getLead(ctx: RepoContext, id: string): CrmLead | null {
    return leads.find(ctx, id);
  },

  createLead(ctx: RepoContext, data: Omit<CrmLead, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): CrmLead {
    return leads.create(ctx, data);
  },

  assignLead(ctx: RepoContext, id: string, userId: string): CrmLead | null {
    return leads.update(ctx, id, { assignedToUserId: userId });
  },

  moveStage(ctx: RepoContext, id: string, stage: FunnelStage, lostReason?: string): CrmLead | null {
    return leads.update(ctx, id, {
      funnelStage: stage,
      lostReason: stage === "fechado_perdido" ? lostReason ?? null : null,
    });
  },

  // --- Activities ---

  listActivities(ctx: RepoContext, leadId?: string): CrmActivity[] {
    return activities
      .list(ctx, (a) => (leadId ? a.leadId === leadId : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  logActivity(ctx: RepoContext, data: Omit<CrmActivity, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): CrmActivity {
    return activities.create(ctx, data);
  },

  scheduleVisit(ctx: RepoContext, leadId: string, scheduledAt: string, description: string): CrmActivity {
    const activity = activities.create(ctx, {
      leadId,
      kind: "visita",
      description,
      scheduledAt,
      doneAt: null,
      byUserId: ctx.userId,
    });
    leads.update(ctx, leadId, { funnelStage: "visita_agendada" });
    return activity;
  },
};
