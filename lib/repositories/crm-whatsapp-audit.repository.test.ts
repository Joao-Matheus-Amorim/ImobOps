import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { aiActionsRepository, auditRepository } from "./audit.repository";
import { crmRepository } from "./crm.repository";
import { whatsappRepository } from "./whatsapp.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };
const otherCtx = { tenancyId: "tenancy-test-other", userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("crmRepository", () => {
  it("creates, assigns, moves and schedules a lead visit", async () => {
    const lead = await crmRepository.createLead(ctx, {
      clientId: null,
      source: "site",
      interest: "venda",
      assignedToUserId: null,
      funnelStage: "novo",
      lostReason: null,
    });

    await expect(crmRepository.getLead(ctx, lead.id)).resolves.toMatchObject({
      funnelStage: "novo",
    });
    await expect(crmRepository.getLead(otherCtx, lead.id)).resolves.toBeNull();

    await crmRepository.assignLead(ctx, lead.id, DEMO_USERS.broker);
    await expect(crmRepository.moveStage(ctx, lead.id, "fechado_perdido", "Sem orçamento")).resolves.toMatchObject({
      assignedToUserId: DEMO_USERS.broker,
      funnelStage: "fechado_perdido",
      lostReason: "Sem orçamento",
    });
    await expect(crmRepository.moveStage(ctx, lead.id, "qualificado")).resolves.toMatchObject({
      lostReason: null,
    });

    const activity = await crmRepository.scheduleVisit(
      ctx,
      lead.id,
      "2026-08-15T14:00:00.000Z",
      "Visita ao imóvel",
    );
    expect(activity).toMatchObject({ kind: "visita", leadId: lead.id });
    await expect(crmRepository.getLead(ctx, lead.id)).resolves.toMatchObject({
      funnelStage: "visita_agendada",
    });
    await expect(crmRepository.listActivities(ctx, lead.id)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: activity.id })]),
    );
  });
});

describe("whatsappRepository", () => {
  it("upserts conversations and appends messages in chronological order", async () => {
    const phone = `+5511${suffix().replace(/\D/g, "").slice(0, 8).padEnd(8, "0")}`;
    const created = await whatsappRepository.upsertConversation(ctx, phone, "locacao");
    const again = await whatsappRepository.upsertConversation(ctx, phone, "venda");

    expect(again.id).toBe(created.id);
    expect(created.triageClassification).toBe("locacao");
    await expect(whatsappRepository.getConversation(otherCtx, created.id)).resolves.toBeNull();

    await whatsappRepository.appendMessage(ctx, {
      conversationId: created.id,
      direction: "in",
      body: "Primeira mensagem",
      mediaUrl: null,
      templateKey: null,
      externalId: null,
      sentAt: "2026-08-01T10:00:00.000Z",
      deliveredAt: "2026-08-01T10:00:01.000Z",
      readAt: null,
      sentBy: "user",
    });
    await whatsappRepository.appendMessage(ctx, {
      conversationId: created.id,
      direction: "out",
      body: "Resposta",
      mediaUrl: null,
      templateKey: null,
      externalId: null,
      sentAt: "2026-08-01T10:05:00.000Z",
      deliveredAt: null,
      readAt: null,
      sentBy: "system",
    });

    await expect(whatsappRepository.getConversation(ctx, created.id)).resolves.toMatchObject({
      lastMessageAt: "2026-08-01T10:05:00.000Z",
    });
    const messages = await whatsappRepository.listMessages(ctx, created.id);
    expect(messages.map((message) => message.body)).toEqual([
      "Primeira mensagem",
      "Resposta",
    ]);
  });
});

describe("auditRepository and aiActionsRepository", () => {
  it("records append-only audit entries scoped by tenancy", async () => {
    const entityId = `entity-${suffix()}`;
    const entry = await auditRepository.log(ctx, {
      userId: ctx.userId,
      action: "update",
      entityType: "client",
      entityId,
      payloadBefore: { name: "Antes" },
      payloadAfter: { name: "Depois" },
    });

    expect(entry).toMatchObject({ tenancyId: ctx.tenancyId, entityId });
    await expect(auditRepository.list(ctx)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: entry.id })]),
    );
    await expect(auditRepository.list(otherCtx)).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: entry.id })]),
    );
  });

  it("records AI actions with confirmation metadata", async () => {
    const prompt = `prompt-${suffix()}`;
    const entry = await aiActionsRepository.record(ctx, {
      userId: ctx.userId,
      prompt,
      toolName: "client.update",
      toolParams: { id: "client-00000001" },
      dryRun: true,
      confirmed: false,
      result: null,
      error: "review_required",
    });

    expect(entry).toMatchObject({ prompt, dryRun: true, confirmed: false });
    await expect(aiActionsRepository.list(ctx)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: entry.id })]),
    );
  });
});
