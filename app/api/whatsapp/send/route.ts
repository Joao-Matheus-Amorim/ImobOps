// Outbound WhatsApp send. Enforces the caller's permission, sends via the adapter,
// and persists the outgoing message.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";

const bodySchema = z.object({
  to: z.string().min(5),
  body: z.string().min(1).optional(),
  templateKey: z.string().optional(),
  vars: z.record(z.string()).optional(),
});

export async function POST(request: Request) {
  const principal = getPrincipal();
  const user = getSessionUser();
  if (!can(principal, "whatsapp", "create")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || (!parsed.data.body && !parsed.data.templateKey)) {
    return NextResponse.json({ error: "Informe body ou templateKey." }, { status: 400 });
  }
  const { to, body, templateKey, vars } = parsed.data;

  const adapter = getWhatsAppAdapter();
  const ctx = { tenancyId: user.tenancyId, userId: user.id };

  const sent = templateKey
    ? await adapter.sendTemplate(to, templateKey, vars ?? {})
    : await adapter.sendMessage(to, body!);

  const conversation = whatsappRepository.upsertConversation(ctx, to);
  whatsappRepository.appendMessage(ctx, {
    conversationId: conversation.id,
    direction: "out",
    body: body ?? `[template:${templateKey}]`,
    mediaUrl: null,
    templateKey: templateKey ?? null,
    externalId: sent.externalId,
    sentAt: new Date().toISOString(),
    deliveredAt: null,
    readAt: null,
    sentBy: "user",
  });

  return NextResponse.json({ ok: true, externalId: sent.externalId });
}
