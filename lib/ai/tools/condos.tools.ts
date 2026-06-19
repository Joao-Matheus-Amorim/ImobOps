import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { formatBRL } from "@/lib/utils";

export const condoTools = [
  defineTool({
    name: "create_condo",
    description: "Cadastra um condomínio administrado.",
    effect: "write",
    feature: "condos",
    action: "create",
    schema: z.object({ name: z.string(), address: z.string(), unitCount: z.number().min(1), adminFeePct: z.number().min(0).max(100) }),
    run: async (p, ctx) =>
      condosRepository.create(repoCtx(ctx), { name: p.name, address: p.address, unitCount: p.unitCount, managerUserId: ctx.userId, adminFeePct: p.adminFeePct }),
    preview: async (p) => `Cadastrar condomínio "${p.name}" (${p.unitCount} unidades).`,
  }),

  defineTool({
    name: "add_unit",
    description: "Adiciona uma unidade a um condomínio.",
    effect: "write",
    feature: "condos",
    action: "create",
    schema: z.object({ condoId: z.string(), label: z.string(), fractionPct: z.number().min(0).max(100), ownerClientId: z.string().optional() }),
    run: async (p, ctx) =>
      condosRepository.addUnit(repoCtx(ctx), {
        condoId: p.condoId,
        label: p.label,
        ownerClientId: p.ownerClientId ?? null,
        currentResidentClientId: null,
        areaM2: null,
        fractionPct: p.fractionPct,
      }),
    preview: async (p) => `Adicionar unidade "${p.label}".`,
  }),

  defineTool({
    name: "generate_condo_fees",
    description: "Gera as taxas mensais de um condomínio.",
    effect: "write",
    feature: "condo_fees",
    action: "create",
    schema: z.object({ condoId: z.string(), referenceMonth: z.string(), dueDate: z.string(), amount: z.number().positive() }),
    run: async (p, ctx) => condosRepository.generateFees(repoCtx(ctx), p.condoId, p.referenceMonth, p.dueDate, p.amount),
    preview: async (p) => `Gerar taxas de ${formatBRL(p.amount)} para ${p.referenceMonth}.`,
  }),

  defineTool({
    name: "mark_condo_fee_paid",
    description: "Marca uma taxa de condomínio como paga.",
    effect: "write",
    feature: "condo_fees",
    action: "edit",
    schema: z.object({ feeId: z.string() }),
    run: async ({ feeId }, ctx) => condosRepository.markFeePaid(repoCtx(ctx), feeId),
    preview: async ({ feeId }) => `Marcar taxa ${feeId} como paga.`,
  }),

  defineTool({
    name: "register_condo_expense",
    description: "Lança uma despesa comum de condomínio.",
    effect: "write",
    feature: "condo_expenses",
    action: "create",
    schema: z.object({ condoId: z.string(), referenceMonth: z.string(), description: z.string(), totalAmount: z.number().positive(), apportionment: z.enum(["igual", "fracao_ideal"]) }),
    run: async (p, ctx) =>
      condosRepository.registerExpense(repoCtx(ctx), {
        condoId: p.condoId,
        referenceMonth: p.referenceMonth,
        description: p.description,
        totalAmount: p.totalAmount,
        apportionment: p.apportionment,
        status: "lancada",
      }),
    preview: async (p) => `Lançar despesa "${p.description}" (${formatBRL(p.totalAmount)}).`,
  }),

  defineTool({
    name: "apportion_expense",
    description: "Rateia uma despesa entre as unidades.",
    effect: "write",
    feature: "condo_expenses",
    action: "edit",
    schema: z.object({ expenseId: z.string() }),
    run: async ({ expenseId }, ctx) => condosRepository.apportionExpense(repoCtx(ctx), expenseId),
    preview: async ({ expenseId }) => `Ratear despesa ${expenseId} entre as unidades.`,
  }),
];
