import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { nextRunAt, chargeOffsetRunAt, AUTOMATION_TIMEZONE } from "./schedule";
import { executeAutomationAction, validateAutomationAction } from "./executor";
import { dispatchDueAutomations } from "./dispatcher";
import { automationRepository } from "@/lib/repositories/automation.repository";
import { getTool } from "@/lib/ai/tools/registry";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe("automation schedule", () => {
  it("usa fuso America/Sao_Paulo", () => {
    expect(AUTOMATION_TIMEZONE).toBe("America/Sao_Paulo");
  });

  it("calcula próxima execução única no fuso de São Paulo", () => {
    const result = nextRunAt(
      { kind: "once", localDate: "2026-07-10", localTime: "09:30" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-10T12:30:00.000Z");
  });

  it("retorna null para evento único no passado", () => {
    const result = nextRunAt(
      { kind: "once", localDate: "2025-01-01", localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBeNull();
  });

  it("retorna null para evento único sem localDate", () => {
    const result = nextRunAt(
      { kind: "once", localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBeNull();
  });

  it("calcula execução diária (mesmo dia se horário ainda não passou)", () => {
    const result = nextRunAt(
      { kind: "daily", localTime: "23:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-10T02:00:00.000Z"); // 23h BRT = 02h UTC next day
  });

  it("calcula execução diária (próximo dia se horário já passou)", () => {
    const result = nextRunAt(
      { kind: "daily", localTime: "08:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-10T11:00:00.000Z"); // 08h BRT = 11h UTC same day? No, 08h BRT = 11h UTC
  });

  it("calcula execução semanal no dia correto", () => {
    // 2026-07-09 is a Thursday (UTC). Request Monday (1) and Wednesday (3).
    const result = nextRunAt(
      { kind: "weekly", weekDays: [1, 3], localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    // Next Monday 2026-07-13 at 10h BRT = 13h UTC
    expect(result).toBe("2026-07-13T13:00:00.000Z");
  });

  it("calcula execução semanal (defaults to Monday if no weekDays)", () => {
    const result = nextRunAt(
      { kind: "weekly", localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-13T13:00:00.000Z");
  });

  it("calcula execução mensal no dia correto", () => {
    const result = nextRunAt(
      { kind: "monthly", monthDays: [15], localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-15T13:00:00.000Z");
  });

  it("calcula execução mensal (próximo mês se dia já passou)", () => {
    const result = nextRunAt(
      { kind: "monthly", monthDays: [5], localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-08-05T13:00:00.000Z");
  });

  it("limita dia mensal ao último dia do mês", () => {
    const result = nextRunAt(
      { kind: "monthly", monthDays: [31], localTime: "10:00" },
      new Date("2026-09-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-09-30T13:00:00.000Z"); // September has 30 days
  });

  it("calcula execução por intervalo de dias", () => {
    const result = nextRunAt(
      { kind: "interval_days", intervalDays: 5, localDate: "2026-07-10", localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-10T13:00:00.000Z");
  });

  it("calcula intervalo de dias a partir de hoje se localDate não definido", () => {
    const result = nextRunAt(
      { kind: "interval_days", intervalDays: 3, localTime: "23:00" },
      new Date("2026-07-10T12:00:00.000Z"),
    );
    // 2026-07-10 at 23h BRT = 2026-07-11 02h UTC
    expect(result).toBe("2026-07-11T02:00:00.000Z");
  });

  it("defaults intervalDays to 3 if not specified", () => {
    const result = nextRunAt(
      { kind: "interval_days", localDate: "2026-07-10", localTime: "10:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBe("2026-07-10T13:00:00.000Z");
  });

  it("retorna null para tipo de trigger não suportado", () => {
    const result = nextRunAt(
      { kind: "charge_due", localTime: "09:00" },
      new Date("2026-07-09T12:00:00.000Z"),
    );
    expect(result).toBeNull();
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

  it("valida todos os tipos de ação sem payload (mark_paid, apportion)", () => {
    expect(validateAutomationAction({ kind: "mark_charge_paid", payload: {}, targetId: "c1" })).toEqual({});
    expect(validateAutomationAction({ kind: "apportion_condo_expense", payload: {}, targetId: "e1" })).toEqual({});
  });

  it("rejeita ação com kind inválido", () => {
    expect(() =>
      validateAutomationAction({ kind: "nonexistent" as never, payload: {} }),
    ).toThrow("Ação não suportada");
  });

  it("valida cobrança avulsa com valores corretos", () => {
    expect(
      validateAutomationAction({
        kind: "create_charge_standalone",
        payload: { clientId: "c1", amount: 1500, dueDate: "2026-08-15", method: "pix" },
      }),
    ).toMatchObject({ amount: 1500, method: "pix" });
  });

  it("rejeita cobrança com valor zero", () => {
    expect(() =>
      validateAutomationAction({
        kind: "create_charge_standalone",
        payload: { clientId: "c1", amount: 0, dueDate: "2026-08-15" },
      }),
    ).toThrow();
  });

  it("exige targetId para ações update", () => {
    expect(() =>
      validateAutomationAction({ kind: "update_client", payload: { tags: ["novo"] } }),
    ).toThrow("A ação exige um registro alvo.");
  });

  it("valida criação de lead com defaults", () => {
    expect(
      validateAutomationAction({ kind: "create_crm_lead", payload: {} }),
    ).toMatchObject({ source: "outros", interest: "outro", funnelStage: "novo" });
  });

  it("valida criação de anúncio de venda", () => {
    expect(
      validateAutomationAction({
        kind: "create_sale_listing",
        payload: { propertyId: "p1", askingPrice: 500000 },
      }),
    ).toMatchObject({ askingPrice: 500000, status: "ativa", commissionPct: 6 });
  });

  it("valida criação de condomínio", () => {
    expect(
      validateAutomationAction({
        kind: "create_condo",
        payload: { name: "Edifício Solar", address: "Rua A, 100", unitCount: 20 },
      }),
    ).toMatchObject({ name: "Edifício Solar", adminFeePct: 10 });
  });

  it("rejeita criação de cliente PJ sem nome", () => {
    expect(() =>
      validateAutomationAction({
        kind: "create_client",
        payload: { kind: "pj", name: "", phone: "11988887777" },
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

  it("cria cliente via execução de automação", async () => {
    const name = `Cliente Auto ${suffix()}`;
    const result = await executeAutomationAction(ctx, {
      kind: "create_client",
      payload: { kind: "pf", name, phone: "11988887777", rolesInBusiness: ["lead"], tags: [] },
    });
    expect(result.name).toBe(name);
  });

  it("cria lead CRM via execução de automação", async () => {
    const result = await executeAutomationAction(ctx, {
      kind: "create_crm_lead",
      payload: { source: "site", interest: "locacao", funnelStage: "novo" },
    });
    expect(result.id).toBeTruthy();
  });

  it("cria cobrança avulsa via execução de automação", async () => {
    const result = await executeAutomationAction(ctx, {
      kind: "create_charge_standalone",
      payload: { clientId: "client-00000002", amount: 500, dueDate: "2026-10-01", method: "boleto", description: `Cobrança auto ${suffix()}` },
    });
    expect(result).toMatchObject({ status: "pendente" });
  });

  it("marca cobrança como paga via execução de automação", async () => {
    const result = await executeAutomationAction(ctx, {
      kind: "mark_charge_paid",
      payload: {},
      targetId: "charge-00000001",
    });
    expect(result).toMatchObject({ status: "paga" });
  });

  it("lança erro para kind de ação não suportado", async () => {
    await expect(
      executeAutomationAction(ctx, { kind: "nonexistent" as never, payload: {} }),
    ).rejects.toThrow("Ação não suportada");
  });

  it("lança erro para ação que exige targetId sem fornecê-lo", async () => {
    await expect(
      executeAutomationAction(ctx, { kind: "mark_charge_paid", payload: {} }),
    ).rejects.toThrow("A ação exige um registro alvo.");
  });
});

describe("automation dispatcher", () => {
  it("dispatch executa regras do mock e retorna resultados", async () => {
    const results = await dispatchDueAutomations(ctx, new Date("2026-07-15T12:00:00.000Z"));
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r).toHaveProperty("ruleId");
      expect(r).toHaveProperty("ok");
    }
  });

  it("dispatch não quebra quando não há regras vencidas", async () => {
    const results = await dispatchDueAutomations(ctx, new Date("2024-01-01T00:00:00.000Z"));
    expect(Array.isArray(results)).toBe(true);
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
