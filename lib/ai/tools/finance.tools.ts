// AI tools for billing: create a standalone charge (boleto/PIX) for a client and
// send an existing charge to the client over WhatsApp. Both are write tools, so
// the chat flow shows a dry-run preview and requires confirmation before running.
import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { formatBRL } from "@/lib/utils";

const method = z.enum(["boleto", "pix", "cartao"]);

export const financeTools = [
  defineTool({
    name: "create_charge",
    description:
      "Cria uma cobrança avulsa (boleto, PIX ou cartão) para um cliente. Use o clientId obtido por search_clients. Valor em reais; vencimento yyyy-mm-dd.",
    effect: "write",
    feature: "finance",
    action: "create",
    schema: z.object({
      clientId: z.string().min(1, "Informe o clientId (use search_clients)."),
      amount: z.number().positive("Valor deve ser positivo."),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use yyyy-mm-dd."),
      method: method.default("boleto"),
      description: z.string().max(200).optional(),
    }),
    run: async (p, ctx) =>
      billingRepository.emitStandalone(repoCtx(ctx), {
        clientId: p.clientId,
        amount: p.amount,
        dueDate: p.dueDate,
        method: p.method ?? "boleto",
        description: p.description,
      }),
    preview: async (p, ctx) => {
      const client = await clientsRepository.get(repoCtx(ctx), p.clientId);
      const who = client?.name ?? p.clientId;
      return `Criar cobrança ${(p.method ?? "boleto").toUpperCase()} de ${formatBRL(p.amount)} para ${who}, vencimento ${p.dueDate}${p.description ? ` (${p.description})` : ""}.`;
    },
  }),

  defineTool({
    name: "send_charge_whatsapp",
    description:
      "Envia uma cobrança já criada (boleto/PIX) ao cliente pelo WhatsApp. Use o chargeId retornado por create_charge.",
    effect: "write",
    feature: "finance",
    action: "edit",
    schema: z.object({
      chargeId: z.string().min(1, "Informe o chargeId (retornado por create_charge)."),
    }),
    run: async ({ chargeId }, ctx) =>
      billingRepository.sendChargeWhatsApp(repoCtx(ctx), chargeId),
    preview: async ({ chargeId }) =>
      `Enviar a cobrança ${chargeId} ao cliente pelo WhatsApp (boleto/PIX).`,
  }),
];
