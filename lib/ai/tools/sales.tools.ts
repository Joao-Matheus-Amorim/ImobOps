import { S } from "@/lib/status";
import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { formatBRL } from "@/lib/utils";

export const salesTools = [
  defineTool({
    name: "create_listing",
    description: "Cria uma listagem de venda para um imóvel.",
    effect: "write",
    feature: "sales",
    action: "create",
    schema: z.object({ propertyId: z.string(), askingPrice: z.number().positive(), commissionPct: z.number().min(0).max(100) }),
    run: async (p, ctx) =>
      salesRepository.createListing(repoCtx(ctx), {
        propertyId: p.propertyId,
        askingPrice: p.askingPrice,
        commissionPct: p.commissionPct,
        status: S.ATIVA,
      }),
    preview: async (p) => `Criar listagem de venda por ${formatBRL(p.askingPrice)}.`,
  }),

  defineTool({
    name: "register_proposal",
    description: "Registra uma proposta de compra em uma listagem.",
    effect: "write",
    feature: "sales",
    action: "create",
    schema: z.object({ listingId: z.string(), buyerClientId: z.string(), offeredPrice: z.number().positive(), conditions: z.string().optional() }),
    run: async (p, ctx) =>
      salesRepository.registerProposal(repoCtx(ctx), {
        listingId: p.listingId,
        buyerClientId: p.buyerClientId,
        brokerUserId: ctx.userId,
        offeredPrice: p.offeredPrice,
        conditions: p.conditions ?? null,
        status: "em_analise",
        history: [{ at: new Date().toISOString(), by: "buyer", price: p.offeredPrice, note: p.conditions ?? null }],
      }),
    preview: async (p) => `Registrar proposta de ${formatBRL(p.offeredPrice)}.`,
  }),

  defineTool({
    name: "move_proposal",
    description: "Move uma proposta para um novo status.",
    effect: "write",
    feature: "sales",
    action: "edit",
    schema: z.object({ id: z.string(), status: z.enum(["em_analise", "contraproposta", "aceita", "recusada"]), note: z.string().optional() }),
    run: async ({ id, status, note }, ctx) => salesRepository.moveProposal(repoCtx(ctx), id, status, note),
    preview: async ({ id, status }) => `Mover proposta ${id} para "${status}".`,
  }),

  defineTool({
    name: "close_sale_contract",
    description: "Fecha um contrato de venda a partir de uma listagem.",
    effect: "write",
    feature: "sales",
    action: "create",
    schema: z.object({ listingId: z.string(), buyerClientId: z.string(), sellerClientId: z.string(), finalPrice: z.number().positive() }),
    run: async (p, ctx) =>
      salesRepository.closeSaleContract(repoCtx(ctx), {
        listingId: p.listingId,
        buyerClientId: p.buyerClientId,
        sellerClientId: p.sellerClientId,
        finalPrice: p.finalPrice,
        signedAt: new Date().toISOString(),
        paymentTerms: null,
        status: S.FECHADO,
      }),
    preview: async (p) => `Fechar venda por ${formatBRL(p.finalPrice)}.`,
  }),

  defineTool({
    name: "record_commission_payment",
    description: "Marca uma comissão como paga.",
    effect: "write",
    feature: "commissions",
    action: "edit",
    schema: z.object({ commissionId: z.string() }),
    run: async ({ commissionId }, ctx) => financeRepository.recordCommissionPayment(repoCtx(ctx), commissionId),
    preview: async ({ commissionId }) => `Marcar comissão ${commissionId} como paga.`,
  }),
];
