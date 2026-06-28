import type {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppTemplate,
  TriageClassification,
} from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";

const conversations = new Collection<WhatsAppConversation>(
  "conversations",
  "whatsapp_conversations",
);
const messages = new Collection<WhatsAppMessage>("messages", "whatsapp_messages");
const templates = new Collection<WhatsAppTemplate>("whatsappTemplates", "whatsapp_templates");

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
    contactName?: string,
  ): Promise<WhatsAppConversation> {
    const list = await conversations.list(ctx, (c) => c.phone === phone);
    const existing = list.at(0);
    if (existing) {
      // Backfill the display name once we learn it (older rows have none).
      if (contactName && existing.contactName !== contactName) {
        const updated = await conversations.update(ctx, existing.id, { contactName });
        return updated ?? existing;
      }
      return existing;
    }
    return conversations.create(ctx, {
      clientId: null,
      phone,
      contactName: contactName ?? null,
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

  // Fetch recent messages for the tenancy and group by conversation.
  // Limits to the last 500 messages to avoid payload explosion while keeping recent history.
  async messagesByConversation(ctx: RepoContext): Promise<Map<string, WhatsAppMessage[]>> {
    const rows = await messages.list(ctx, undefined, {
      orderBy: { column: "sentAt", ascending: false },
      limit: 500,
    });
    rows.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const map = new Map<string, WhatsAppMessage[]>();
    for (const m of rows) {
      const arr = map.get(m.conversationId);
      if (arr) arr.push(m);
      else map.set(m.conversationId, [m]);
    }
    return map;
  },

  async appendMessage(
    ctx: RepoContext,
    data: Omit<WhatsAppMessage, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<WhatsAppMessage> {
    const msg = await messages.create(ctx, data);
    await conversations.update(ctx, data.conversationId, { lastMessageAt: msg.sentAt });
    return msg;
  },

  // --- Quick-reply templates (admin-editable) ---

  async listTemplates(ctx: RepoContext, onlyActive = false): Promise<WhatsAppTemplate[]> {
    const rows = await templates.list(ctx, (t) => (onlyActive ? t.active : true));
    return rows.sort((a, b) => a.title.localeCompare(b.title));
  },

  getTemplate(ctx: RepoContext, id: string): Promise<WhatsAppTemplate | null> {
    return templates.find(ctx, id);
  },

  createTemplate(
    ctx: RepoContext,
    data: Omit<WhatsAppTemplate, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<WhatsAppTemplate> {
    return templates.create(ctx, data);
  },

  updateTemplate(
    ctx: RepoContext,
    id: string,
    patch: Partial<WhatsAppTemplate>,
  ): Promise<WhatsAppTemplate | null> {
    return templates.update(ctx, id, patch);
  },

  deleteTemplate(ctx: RepoContext, id: string): Promise<boolean> {
    return templates.remove(ctx, id);
  },
};
