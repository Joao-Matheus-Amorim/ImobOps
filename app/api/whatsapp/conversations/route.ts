// Read-only feed for the WhatsApp inbox UI. Returns every conversation with its
// messages so the client can poll for near-real-time updates without a socket.
import { NextResponse } from "next/server";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

// Never cache: the inbox polls this for near-real-time updates.
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  // Two queries total (conversations + all messages) instead of N+1.
  const [conversations, byConversation] = await Promise.all([
    whatsappRepository.listConversations(ctx),
    whatsappRepository.messagesByConversation(ctx),
  ]);
  const withMessages = conversations.map((conversation) => ({
    ...conversation,
    messages: byConversation.get(conversation.id) ?? [],
  }));

  return NextResponse.json({ conversations: withMessages });
}
