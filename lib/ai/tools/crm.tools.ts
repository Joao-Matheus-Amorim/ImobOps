import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { crmRepository } from "@/lib/repositories/crm.repository";

const stage = z.enum(["novo", "qualificado", "visita_agendada", "proposta", "fechado_ganho", "fechado_perdido"]);

export const crmTools = [
  defineTool({
    name: "create_lead",
    description: "Cria um lead no CRM.",
    effect: "write",
    feature: "crm",
    action: "create",
    schema: z.object({
      clientId: z.string().optional(),
      source: z.enum(["whatsapp", "site", "indicacao", "outros"]),
      interest: z.enum(["locacao", "venda", "condominio", "outro"]),
    }),
    run: async (p, ctx) =>
      crmRepository.createLead(repoCtx(ctx), {
        clientId: p.clientId ?? null,
        source: p.source,
        interest: p.interest,
        assignedToUserId: ctx.userId,
        funnelStage: "novo",
        lostReason: null,
      }),
    preview: async (p) => `Criar lead (interesse: ${p.interest}, origem: ${p.source}).`,
  }),

  defineTool({
    name: "assign_lead",
    description: "Atribui um lead a um usuário.",
    effect: "write",
    feature: "crm",
    action: "edit",
    schema: z.object({ leadId: z.string(), userId: z.string() }),
    run: async ({ leadId, userId }, ctx) => crmRepository.assignLead(repoCtx(ctx), leadId, userId),
    preview: async ({ leadId, userId }) => `Atribuir lead ${leadId} ao usuário ${userId}.`,
  }),

  defineTool({
    name: "move_lead_stage",
    description: "Move um lead para outra etapa do funil.",
    effect: "write",
    feature: "crm",
    action: "edit",
    schema: z.object({ leadId: z.string(), stage, lostReason: z.string().optional() }),
    run: async ({ leadId, stage: s, lostReason }, ctx) => crmRepository.moveStage(repoCtx(ctx), leadId, s, lostReason),
    preview: async ({ leadId, stage: s }) => `Mover lead ${leadId} para "${s}".`,
  }),

  defineTool({
    name: "log_activity",
    description: "Registra uma atividade em um lead.",
    effect: "write",
    feature: "crm",
    action: "edit",
    schema: z.object({ leadId: z.string(), kind: z.enum(["ligacao", "visita", "whatsapp", "email", "proposta", "nota"]), description: z.string() }),
    run: async (p, ctx) =>
      crmRepository.logActivity(repoCtx(ctx), {
        leadId: p.leadId,
        kind: p.kind,
        description: p.description,
        scheduledAt: null,
        doneAt: new Date().toISOString(),
        byUserId: ctx.userId,
      }),
    preview: async (p) => `Registrar atividade "${p.kind}" no lead ${p.leadId}.`,
  }),

  defineTool({
    name: "schedule_visit",
    description: "Agenda uma visita para um lead.",
    effect: "write",
    feature: "crm",
    action: "edit",
    schema: z.object({ leadId: z.string(), scheduledAt: z.string(), description: z.string() }),
    run: async ({ leadId, scheduledAt, description }, ctx) =>
      crmRepository.scheduleVisit(repoCtx(ctx), leadId, scheduledAt, description),
    preview: async ({ leadId, scheduledAt }) => `Agendar visita do lead ${leadId} para ${scheduledAt}.`,
  }),
];
