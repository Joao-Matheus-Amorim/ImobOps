// Read-only feed for the WhatsApp inbox UI. Returns every conversation with its
// messages so the client can poll for near-real-time updates without a socket.
import { NextResponse } from "next/server";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

export async function GET() {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  if (!can(principal, "whatsapp", "view")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  const conversations = await whatsappRepository.listConversations(ctx);
  const withMessages = await Promise.all(
    conversations.map(async (conversation) => ({
      ...conversation,
      messages: await whatsappRepository.listMessages(ctx, conversation.id),
    })),
  );

  return NextResponse.json({ conversations: withMessages });
}
