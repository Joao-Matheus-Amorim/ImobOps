// Inbound WhatsApp webhook (Evolution API). Validates the optional signature token,
// normalizes the payload, persists the message, and runs triage.
import { NextResponse } from "next/server";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { triageInbound } from "@/lib/whatsapp/triage-bot";
import { DEMO_TENANCY_ID } from "@/lib/constants";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

// In single-tenant mode all inbound messages belong to the demo tenancy. In SaaS
// mode the instance → tenancy mapping resolves this.
const SYSTEM_CTX = { tenancyId: DEMO_TENANCY_ID, userId: "system" };
const WEBHOOK_LIMIT = 120;
const WEBHOOK_WINDOW_MS = 60_000;

function signatureValid(request: Request): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!expected) return true; // no token configured → accept (dev/mock)
  const got = request.headers.get("x-webhook-token");
  return got === expected;
}

export async function POST(request: Request) {
  const limit = rateLimit(
    `ip:${clientIp(request)}:/api/whatsapp/webhook`,
    WEBHOOK_LIMIT,
    WEBHOOK_WINDOW_MS,
  );
  if (!limit.ok) return tooManyRequests(limit);

  if (!signatureValid(request)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const adapter = getWhatsAppAdapter();
  const inbound = adapter.parseWebhook(payload);
  if (!inbound) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const triage = await triageInbound(SYSTEM_CTX, inbound.body);
  const conversation = await whatsappRepository.upsertConversation(
    SYSTEM_CTX,
    inbound.phone,
    triage.classification,
  );

  await whatsappRepository.appendMessage(SYSTEM_CTX, {
    conversationId: conversation.id,
    direction: "in",
    body: inbound.body,
    mediaUrl: inbound.mediaUrl ?? null,
    templateKey: null,
    externalId: inbound.externalId,
    sentAt: inbound.timestamp,
    deliveredAt: inbound.timestamp,
    readAt: null,
    sentBy: "user",
  });

  return NextResponse.json({
    ok: true,
    classification: triage.classification,
    leadCreated: Boolean(triage.leadId),
  });
}
