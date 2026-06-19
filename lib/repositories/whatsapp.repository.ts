import type {
  WhatsAppConversation,
  WhatsAppMessage,
  TriageClassification,
} from "@/lib/types/domain";
import { MockCollection, type RepoContext } from "./base";

const conversations = new MockCollection<WhatsAppConversation>("conversations");
const messages = new MockCollection<WhatsAppMessage>("messages");

export const whatsappRepository = {
  listConversations(ctx: RepoContext, query?: string): WhatsAppConversation[] {
    const q = query?.trim().toLowerCase();
    return conversations
      .list(ctx, (c) => (q ? c.phone.toLowerCase().includes(q) : true))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  getConversation(ctx: RepoContext, id: string): WhatsAppConversation | null {
    return conversations.find(ctx, id);
  },

  // Find or create a conversation for a phone number.
  upsertConversation(ctx: RepoContext, phone: string, classification?: TriageClassification): WhatsAppConversation {
    const existing = conversations.list(ctx, (c) => c.phone === phone).at(0);
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

  listMessages(ctx: RepoContext, conversationId: string): WhatsAppMessage[] {
    return messages
      .list(ctx, (m) => m.conversationId === conversationId)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  },

  appendMessage(ctx: RepoContext, data: Omit<WhatsAppMessage, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">): WhatsAppMessage {
    const msg = messages.create(ctx, data);
    conversations.update(ctx, data.conversationId, { lastMessageAt: msg.sentAt });
    return msg;
  },
};
