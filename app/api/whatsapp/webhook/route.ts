// Inbound WhatsApp webhook. Supports both providers:
// - Evolution (default): one message per POST, token in x-webhook-token.
// - Meta Cloud API (WHATSAPP_PROVIDER=meta): GET verification (hub.challenge) and
//   POST with entry[].changes[].value.messages[] (possibly several).
// Normalizes via the active adapter, persists, runs triage, pushes to the inbox.
import { NextResponse } from "next/server";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { metaWebhookVerify } from "@/lib/whatsapp/meta";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { triageInbound, generateReply } from "@/lib/whatsapp/triage-bot";
import { defaultSystemTenancyId } from "@/lib/constants";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { publishWhatsAppEvent } from "@/lib/whatsapp/events";
import type { InboundMessage } from "@/lib/whatsapp/adapter";

function systemCtx() {
  return { tenancyId: defaultSystemTenancyId(), userId: "system" };
}
const WEBHOOK_LIMIT = 120;
const WEBHOOK_WINDOW_MS = 60_000;

function signatureValid(request: Request): boolean {
  // Meta has no x-webhook-token; it uses GET verification + payload signature.
  if (process.env.WHATSAPP_PROVIDER === "meta") return true;
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN;
  if (!expected) return true; // no token configured → accept (dev/mock)
  return request.headers.get("x-webhook-token") === expected;
}

// Meta calls GET on the webhook URL to verify ownership.
export async function GET(request: Request) {
  if (process.env.WHATSAPP_PROVIDER !== "meta") {
    return NextResponse.json({ ok: true });
  }
  const { ok, challenge } = metaWebhookVerify(new URL(request.url));
  if (ok && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

// Persist one normalized inbound message, run triage, push SSE, optional reply.
async function processInbound(inbound: InboundMessage): Promise<void> {
  const ctx = systemCtx();
  const triage = inbound.fromMe
    ? { classification: null, leadId: null }
    : await triageInbound(ctx, inbound.body);
  // Contact name only from THEIR messages — fromMe carries OUR pushName.
  const contactName = inbound.fromMe ? undefined : inbound.name;
  const conversation = await whatsappRepository.upsertConversation(
    ctx,
    inbound.phone,
    triage.classification,
    contactName,
  );

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
    publishWhatsAppEvent({ type: "message.upsert", tenancyId: ctx.tenancyId, conversationId: conversation.id });
  }

  if (process.env.WHATSAPP_AI_AUTOREPLY === "true" && !inbound.fromMe) {
    try {
      const reply = await generateReply(inbound.body, triage.classification);
      const sent = await getWhatsAppAdapter().sendMessage(inbound.phone, reply);
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
}

// Pull every inbound message out of a webhook payload. Evolution yields one;
// Meta can yield several (entry[].changes[].value.messages[]).
function extractInbound(payload: unknown): InboundMessage[] {
  const adapter = getWhatsAppAdapter();
  if (process.env.WHATSAPP_PROVIDER === "meta") {
    const changes =
      (payload as { entry?: Array<{ changes?: Array<{ value?: { messages?: unknown[] } }> }> })
        ?.entry?.flatMap((e) => e.changes ?? []) ?? [];
    const out: InboundMessage[] = [];
    for (const change of changes) {
      const messages = change.value?.messages ?? [];
      for (let i = 0; i < messages.length; i++) {
        // Re-wrap so parseWebhook sees one message at a time in Meta shape.
        const single = { entry: [{ changes: [{ value: { ...change.value, messages: [messages[i]] } }] }] };
        const parsed = adapter.parseWebhook(single);
        if (parsed) out.push(parsed);
      }
    }
    return out;
  }
  const one = adapter.parseWebhook(payload);
  return one ? [one] : [];
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
  const inbounds = extractInbound(payload);
  if (inbounds.length === 0) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  for (const inbound of inbounds) {
    await processInbound(inbound);
  }

  return NextResponse.json({ ok: true, processed: inbounds.length });
}
