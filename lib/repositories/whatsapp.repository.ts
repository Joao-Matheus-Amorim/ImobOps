import type {
  WhatsAppConversation,
  WhatsAppMessage,
  TriageClassification,
} from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const conversations = new Collection<WhatsAppConversation>(
  "conversations",
  "whatsapp_conversations",
);
const messages = new Collection<WhatsAppMessage>("messages", "whatsapp_messages");

export const whatsappRepository = {
  async listConversations(ctx: RepoContext, query?: string): Promise<WhatsAppConversation[]> {
    const q = query?.trim().toLowerCase();
    const rows = await conversations.list(ctx, (c) =>
      q ? c.phone.toLowerCase().includes(q) : true,
    );
    return rows.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  getConversation(ctx: RepoContext, id: string): Promise<WhatsAppConversation | null> {
    return conversations.find(ctx, id);
  },

  // Find or create a conversation for a phone number.
  async upsertConversation(
    ctx: RepoContext,
    phone: string,
    classification?: TriageClassification,
  ): Promise<WhatsAppConversation> {
    const list = await conversations.list(ctx, (c) => c.phone === phone);
    const existing = list.at(0);
    if (existing) return existing;
    return conversations.create(ctx, {
      clientId: null,
      phone,
      lastMessageAt: new Date().toISOString(),
      assignedToUserId: null,
      status: "aberta",
      triageClassification: classification ?? null,
    });
  },

  async listMessages(ctx: RepoContext, conversationId: string): Promise<WhatsAppMessage[]> {
    const rows = await messages.list(ctx, (m) => m.conversationId === conversationId);
    return rows.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  },

  async appendMessage(
    ctx: RepoContext,
    data: Omit<WhatsAppMessage, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<WhatsAppMessage> {
    const msg = await messages.create(ctx, data);
    await conversations.update(ctx, data.conversationId, { lastMessageAt: msg.sentAt });
    return msg;
  },
};
