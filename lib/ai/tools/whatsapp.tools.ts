import { z } from "zod";
import { defineTool, repoCtx } from "./helpers";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { TEMPLATE_KEYS } from "@/lib/whatsapp/templates";

export const whatsappTools = [
  defineTool({
    name: "send_whatsapp_message",
    description: "Envia uma mensagem de texto via WhatsApp.",
    effect: "write",
    feature: "whatsapp",
    action: "create",
    schema: z.object({ to: z.string(), body: z.string().min(1) }),
    run: async ({ to, body }, ctx) => {
      const adapter = getWhatsAppAdapter();
      const sent = await adapter.sendMessage(to, body);
      const conversation = whatsappRepository.upsertConversation(repoCtx(ctx), to);
      whatsappRepository.appendMessage(repoCtx(ctx), {
        conversationId: conversation.id,
        direction: "out",
        body,
        mediaUrl: null,
        templateKey: null,
        externalId: sent.externalId,
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        sentBy: "ai",
      });
      return sent;
    },
    preview: async ({ to, body }) => `Enviar para ${to}: "${body}".`,
  }),

  defineTool({
    name: "send_whatsapp_template",
    description: "Envia uma mensagem de template via WhatsApp.",
    effect: "write",
    feature: "whatsapp",
    action: "create",
    schema: z.object({
      to: z.string(),
      templateKey: z.enum(TEMPLATE_KEYS as [string, ...string[]]),
      vars: z.record(z.string()).optional(),
    }),
    run: async ({ to, templateKey, vars }, ctx) => {
      const adapter = getWhatsAppAdapter();
      const sent = await adapter.sendTemplate(to, templateKey, vars ?? {});
      const conversation = whatsappRepository.upsertConversation(repoCtx(ctx), to);
      whatsappRepository.appendMessage(repoCtx(ctx), {
        conversationId: conversation.id,
        direction: "out",
        body: `[template:${templateKey}]`,
        mediaUrl: null,
        templateKey,
        externalId: sent.externalId,
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        sentBy: "system",
      });
      return sent;
    },
    preview: async ({ to, templateKey }) => `Enviar template "${templateKey}" para ${to}.`,
  }),

  defineTool({
    name: "search_conversations",
    description: "Busca conversas de WhatsApp por telefone.",
    effect: "read",
    feature: "whatsapp",
    action: "view",
    schema: z.object({ query: z.string().optional() }),
    run: async ({ query }, ctx) => whatsappRepository.listConversations(repoCtx(ctx), query),
  }),
];
