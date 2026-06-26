// One-off import of existing WhatsApp conversations from the provider (Evolution
// cache). Pulls personal chats active in the last 30 days with their recent
// messages, upserting conversations and de-duplicating messages by externalId.
import { NextResponse } from "next/server";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const PER_CHAT = 20;

export async function POST() {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user || !can(principal, "whatsapp", "create")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }
  const ctx = { tenancyId: user.tenancyId, userId: user.id };

  let chats;
  try {
    chats = await getWhatsAppAdapter().importChats(THIRTY_DAYS_MS, PER_CHAT);
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao buscar conversas: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let conversationsImported = 0;
  let messagesImported = 0;

  for (const chat of chats) {
    const conversation = await whatsappRepository.upsertConversation(
      ctx,
      chat.phone,
      undefined,
      chat.name,
    );
    conversationsImported += 1;

    // Skip messages already present (webhook may have delivered some).
    const existing = await whatsappRepository.listMessages(ctx, conversation.id);
    const seen = new Set(existing.map((m) => m.externalId).filter(Boolean));

    for (const m of chat.messages) {
      if (m.externalId && seen.has(m.externalId)) continue;
      await whatsappRepository.appendMessage(ctx, {
        conversationId: conversation.id,
        direction: m.fromMe ? "out" : "in",
        body: m.body,
        mediaUrl: m.mediaUrl ?? null,
        templateKey: null,
        externalId: m.externalId,
        sentAt: m.timestamp,
        deliveredAt: m.timestamp,
        readAt: null,
        sentBy: "user",
      });
      messagesImported += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    conversationsImported,
    messagesImported,
  });
}
