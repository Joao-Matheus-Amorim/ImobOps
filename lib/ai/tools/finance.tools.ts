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
    name: "list_charges",
    description:
      "Lista cobranças (boletos/PIX) já existentes. Filtre por clientId (use search_clients para obtê-lo) e/ou por status (pendente, vencida, paga). Use para encontrar boletos a enviar, conferir pendências, etc.",
    effect: "read",
    feature: "finance",
    action: "view",
    schema: z.object({
      clientId: z.string().optional(),
      status: z.enum(["pendente", "paga", "vencida", "cancelada", "falha"]).optional(),
      onlyOpen: z.boolean().optional(),
    }),
    run: async (p, ctx) => {
      const all = await billingRepository.list(repoCtx(ctx));
      return all
        .filter((c) => (p.clientId ? c.clientId === p.clientId : true))
        .filter((c) => (p.status ? c.effectiveStatus === p.status : true))
        .filter((c) => (p.onlyOpen ? c.effectiveStatus !== "paga" && c.effectiveStatus !== "cancelada" : true))
        .map((c) => ({
          id: c.id,
          clientId: c.clientId,
          customerName: c.customerName,
          description: c.description,
          amount: c.amount,
          method: c.method,
          dueDate: c.dueDate,
          status: c.effectiveStatus,
          boletoUrl: c.boletoUrl,
        }));
    },
  }),

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
      "Envia uma cobrança existente (boleto/PIX) ao cliente pelo WhatsApp. Obtenha o chargeId via create_charge (recém-criada) OU list_charges (cobranças já existentes).",
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
