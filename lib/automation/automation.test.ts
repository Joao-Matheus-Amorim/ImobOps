import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { nextRunAt, chargeOffsetRunAt } from "./schedule";
import { executeAutomationAction, validateAutomationAction } from "./executor";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { getTool } from "@/lib/ai/tools/registry";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("automation schedule", () => {
  it("calcula próxima execução única no fuso de São Paulo", () => {
    const result = nextRunAt(
      { kind: "once", localDate: "2026-07-10", localTime: "09:30" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-10T12:30:00.000Z");
  });

  it("calcula execução relativa ao vencimento do boleto", () => {
    expect(chargeOffsetRunAt("2026-07-10", -3, "08:00")).toBe("2026-07-07T11:00:00.000Z");
    expect(chargeOffsetRunAt("2026-07-10", 1, "18:30")).toBe("2026-07-11T21:30:00.000Z");
  });
});

describe("automation action validation", () => {
  it("exige nome e sobrenome e telefone ao criar cliente", () => {
    expect(() =>
      validateAutomationAction({
        kind: "create_client",
        payload: { kind: "pf", name: "João", phone: "11999999999", rolesInBusiness: ["lead"], tags: [] },
      }),
    ).toThrow();

    expect(() =>
      validateAutomationAction({
        kind: "create_client",
        payload: { kind: "pf", name: "João Silva", rolesInBusiness: ["lead"], tags: [] },
      }),
    ).toThrow();

    expect(
      validateAutomationAction({
        kind: "create_client",
        payload: { kind: "pf", name: "João Silva", phone: "11999999999", rolesInBusiness: ["lead"], tags: [] },
      }),
    ).toMatchObject({ name: "João Silva", phone: "11999999999" });
  });

  it("valida criação de imóvel e locação por IDs internos selecionados pela UI", () => {
    expect(
      validateAutomationAction({
        kind: "create_property",
        payload: {
          kind: "apartamento",
          address: "Rua Teste, 123",
          status: "disponivel",
          availability: "locacao",
          photos: [],
        },
      }),
    ).toMatchObject({ address: "Rua Teste, 123" });

    expect(() =>
      validateAutomationAction({
        kind: "create_rental_contract",
        payload: {
          propertyId: "",
          landlordClientId: "client-00000001",
          tenantClientId: "client-00000002",
          monthlyValue: 2500,
          dueDay: 10,
          startDate: "2026-07-01",
          endDate: "2027-07-01",
          durationMonths: 12,
        },
      }),
    ).toThrow();
  });
});

describe("automation executor", () => {
  it("cria boleto e envia WhatsApp em uma única ação composta", async () => {
    const description = `Automação boleto WhatsApp ${suffix()}`;
    const result = await executeAutomationAction(ctx, {
      kind: "create_charge_and_send_whatsapp",
      payload: {
        clientId: "client-00000002",
        amount: 123.45,
        dueDate: "2026-09-10",
        method: "boleto",
        description,
      },
    });

    expect(result).toMatchObject({ status: "pendente", whatsappSent: true });

    const charges = await billingRepository.list(ctx);
    const charge = charges.find((item) => item.description === description);
    expect(charge).toBeTruthy();

    const messagesByConversation = await whatsappRepository.messagesByConversation(ctx);
    const allMessages = [...messagesByConversation.values()].flat();
    expect(allMessages.some((message) => message.direction === "out" && message.body.includes(description))).toBe(true);
  });
});

describe("automation AI tool", () => {
  it("cria regra de automação pelo registry da IA", async () => {
    const tool = getTool("create_automation_rule");
    expect(tool).toBeDefined();

    const name = `Criar cliente automático ${suffix()}`;
    const result = await tool!.run(
      {
        name,
        description: "Teste de automação via IA",
        trigger: { kind: "once", localDate: "2026-10-01", localTime: "10:00" },
        action: {
          kind: "create_client",
          payload: {
            kind: "pf",
            name: "Maria Automação",
            phone: "11977776666",
            rolesInBusiness: ["lead"],
            tags: [],
          },
        },
      },
      { tenancyId: ctx.tenancyId, userId: ctx.userId, role: "admin" },
    );

    expect(result).toMatchObject({ name, status: "active", timezone: "America/Sao_Paulo" });

    const rules = await automationRepository.listRules(ctx);
    expect(rules.some((rule) => rule.name === name)).toBe(true);
  });
});
