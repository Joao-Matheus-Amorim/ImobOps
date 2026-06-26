// Inbound WhatsApp webhook (Evolution API). Validates the optional signature token,
// normalizes the payload, persists the message, and runs triage.
import { NextResponse } from "next/server";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { triageInbound, generateReply } from "@/lib/whatsapp/triage-bot";
import { defaultSystemTenancyId } from "@/lib/constants";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { publishWhatsAppEvent } from "@/lib/whatsapp/events";

// In single-tenant mode all inbound messages belong to the demo tenancy. In SaaS
// mode the instance → tenancy mapping resolves this.
function systemCtx() {
  return { tenancyId: defaultSystemTenancyId(), userId: "system" };
}
const WEBHOOK_LIMIT = 120;
const WEBHOOK_WINDOW_MS = 60_000;

function signatureValid(request: Request): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!expected) return true; // no token configured → accept (dev/mock)
  const got = request.headers.get("x-webhook-token");
  return got === expected;
}

export async function POST(request: Request) {
  const limit = await rateLimit(
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

  const ctx = systemCtx();
  // Only triage real inbound messages (from the contact), not our own outbound.
  const triage = inbound.fromMe
    ? { classification: null, leadId: null, assignedTo: null }
    : await triageInbound(ctx, inbound.body);
  // The contact's name only comes from THEIR messages. On fromMe, pushName is
  // OUR name ("João Matheus") — never use it to name the conversation.
  const contactName = inbound.fromMe ? undefined : inbound.name;
  const conversation = await whatsappRepository.upsertConversation(
    ctx,
    inbound.phone,
    triage.classification,
    contactName,
  );

  // Skip if we already stored this exact message (e.g. sent from the app, then
  // echoed back by the webhook as fromMe). Dedup by externalId.
  const already = (await whatsappRepository.listMessages(ctx, conversation.id)).some(
    (m) => m.externalId && m.externalId === inbound.externalId,
  );
  if (!already) {
    await whatsappRepository.appendMessage(ctx, {
      conversationId: conversation.id,
      direction: inbound.fromMe ? "out" : "in",
      body: inbound.body,
      mediaUrl: inbound.mediaUrl ?? null,
      templateKey: null,
      externalId: inbound.externalId,
      sentAt: inbound.timestamp,
      deliveredAt: inbound.timestamp,
      readAt: null,
      sentBy: "user",
    });
    // Push to any open inbox (SSE).
    publishWhatsAppEvent({ type: "message.upsert", tenancyId: ctx.tenancyId, conversationId: conversation.id });
  }

  // Optional AI auto-reply. Disabled by default — a human answers from the
  // inbox. Enable by setting WHATSAPP_AI_AUTOREPLY=true. A send failure must not
  // fail the webhook (Evolution would retry), so we log and still return 200.
  let replySent = false;
  if (process.env.WHATSAPP_AI_AUTOREPLY === "true" && !inbound.fromMe) {
    try {
      const reply = await generateReply(inbound.body, triage.classification);
      const sent = await adapter.sendMessage(inbound.phone, reply);
      replySent = true;
      await whatsappRepository.appendMessage(ctx, {
        conversationId: conversation.id,
        direction: "out",
        body: reply,
        mediaUrl: null,
        templateKey: null,
        externalId: sent.externalId,
        sentAt: new Date().toISOString(),
        deliveredAt: null,
        readAt: null,
        sentBy: "bot",
      });
      publishWhatsAppEvent({ type: "message.upsert", tenancyId: ctx.tenancyId, conversationId: conversation.id });
    } catch (err) {
      console.error("[whatsapp/webhook] failed to send reply:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    classification: triage.classification,
    leadCreated: Boolean(triage.leadId),
    replySent,
  });
}
