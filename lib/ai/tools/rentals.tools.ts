import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import {
  DEFAULT_LATE_FEE_PCT,
  DEFAULT_LATE_INTEREST_PCT_MONTH,
} from "@/lib/types/domain";
import { formatBRL } from "@/lib/utils";

export const rentalTools = [
  defineTool({
    name: "create_rental_contract",
    description: "Cria um contrato de locação.",
    effect: "write",
    feature: "rentals",
    action: "create",
    schema: z.object({
      propertyId: z.string(),
      landlordClientId: z.string(),
      tenantClientId: z.string(),
      monthlyValue: z.number().positive(),
      dueDay: z.number().min(1).max(28),
      startDate: z.string(),
      durationMonths: z.number().min(1).max(60),
      adminFeePct: z.number().min(0).max(100),
    }),
    run: async (p, ctx) => {
      const start = new Date(`${p.startDate}T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + p.durationMonths);
      return rentalsRepository.create(repoCtx(ctx), {
        propertyId: p.propertyId,
        landlordClientId: p.landlordClientId,
        tenantClientId: p.tenantClientId,
        guarantorClientId: null,
        monthlyValue: p.monthlyValue,
        dueDay: p.dueDay,
        startDate: p.startDate,
        endDate: end.toISOString().slice(0, 10),
        durationMonths: p.durationMonths,
        indexType: "igpm",
        adminFeePct: p.adminFeePct,
        lateFeePct: DEFAULT_LATE_FEE_PCT,
        lateInterestPctMonth: DEFAULT_LATE_INTEREST_PCT_MONTH,
        status: "ativo",
      });
    },
    preview: async (p) =>
      `Criar contrato de locação de ${formatBRL(p.monthlyValue)}/mês por ${p.durationMonths} meses.`,
  }),

  defineTool({
    name: "generate_installments",
    description: "Gera as parcelas mensais de um contrato de locação.",
    effect: "write",
    feature: "rentals.installments",
    action: "create",
    schema: z.object({ contractId: z.string() }),
    run: async ({ contractId }, ctx) => rentalsRepository.generateInstallments(repoCtx(ctx), contractId),
    preview: async ({ contractId }) => `Gerar parcelas do contrato ${contractId}.`,
  }),

  defineTool({
    name: "list_installments",
    description: "Lista parcelas (opcionalmente de um contrato).",
    effect: "read",
    feature: "rentals.installments",
    action: "view",
    schema: z.object({ contractId: z.string().optional() }),
    run: async ({ contractId }, ctx) => rentalsRepository.listInstallments(repoCtx(ctx), contractId),
  }),

  defineTool({
    name: "mark_installment_paid",
    description: "Marca uma parcela como paga.",
    effect: "write",
    feature: "rentals.installments",
    action: "edit",
    schema: z.object({ installmentId: z.string(), paidAmount: z.number().positive(), receiptDocumentId: z.string().optional() }),
    run: async ({ installmentId, paidAmount, receiptDocumentId }, ctx) =>
      rentalsRepository.markInstallmentPaid(repoCtx(ctx), installmentId, paidAmount, receiptDocumentId),
    preview: async ({ installmentId, paidAmount }) =>
      `Marcar parcela ${installmentId} como paga (${formatBRL(paidAmount)}).`,
  }),

  defineTool({
    name: "upload_receipt",
    description: "Associa um comprovante a uma parcela (referência de documento).",
    effect: "write",
    feature: "rentals.installments",
    action: "edit",
    schema: z.object({ installmentId: z.string(), documentId: z.string() }),
    run: async ({ installmentId, documentId }, ctx) =>
      rentalsRepository.markInstallmentPaid(repoCtx(ctx), installmentId, 0, documentId),
    preview: async ({ installmentId }) => `Anexar comprovante à parcela ${installmentId}.`,
  }),

  defineTool({
    name: "compute_repasse",
    description: "Calcula o repasse ao proprietário para um mês pago.",
    effect: "write",
    feature: "repasses",
    action: "create",
    schema: z.object({ contractId: z.string(), referenceMonth: z.string() }),
    run: async ({ contractId, referenceMonth }, ctx) =>
      financeRepository.computeRepasse(repoCtx(ctx), contractId, referenceMonth),
    preview: async ({ contractId, referenceMonth }) =>
      `Calcular repasse do contrato ${contractId} para ${referenceMonth}.`,
  }),

  defineTool({
    name: "list_overdue_rentals",
    description: "Lista parcelas de aluguel em atraso.",
    effect: "read",
    feature: "rentals.installments",
    action: "view",
    schema: z.object({}),
    run: async (_p, ctx) => rentalsRepository.listOverdue(repoCtx(ctx)),
  }),
];
