import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { defaultSystemTenancyId } from "@/lib/constants";
import { getWhatsAppAdapter } from "@/lib/whatsapp/provider";
import { publishWhatsAppEvent } from "@/lib/whatsapp/events";
import { generateReply, triageInbound } from "@/lib/whatsapp/triage-bot";

type EvolutionWebhookPayload = unknown;

type QueueItem = {
  payload: EvolutionWebhookPayload;
  receivedAt: number;
};

type InboundMessage = {
  phone: string;
  body: string;
  name?: string;
  mediaUrl?: string;
  externalId: string;
  timestamp: string;
  fromMe?: boolean;
};

type QueueState = {
  items: QueueItem[];
  running: boolean;
  fingerprintSeen: Map<string, number>;
};

type RawWebhook = {
  event?: string;
  type?: string;
  data?: {
    key?: {
      id?: string;
      remoteJid?: string;
      remoteJidAlt?: string;
      fromMe?: boolean;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string };
      videoMessage?: { caption?: string };
      documentMessage?: { caption?: string; fileName?: string };
    };
    messageType?: string;
    messageTimestamp?: number;
    pushName?: string;
    status?: string;
    update?: {
      status?: string;
      messageStatus?: string;
    };
    messageStatus?: string;
  };
  key?: {
    id?: string;
    remoteJid?: string;
    remoteJidAlt?: string;
    fromMe?: boolean;
  };
  status?: string;
  update?: {
    status?: string;
    messageStatus?: string;
  };
  messageStatus?: string;
};

const globalForQueue = globalThis as typeof globalThis & {
  __imobopsWhatsAppQueue?: QueueState;
};

const queue =
  globalForQueue.__imobopsWhatsAppQueue ??
  (globalForQueue.__imobopsWhatsAppQueue = {
    items: [],
    running: false,
    fingerprintSeen: new Map<string, number>(),
  });

const DEDUPE_WINDOW_MS = 5 * 60_000;

function systemCtx() {
  return { tenancyId: defaultSystemTenancyId(), userId: "system" };
}

function fingerprint(payload: EvolutionWebhookPayload): string {
  return createHash("sha1").update(JSON.stringify(payload)).digest("hex");
}

function queuePayload(payload: EvolutionWebhookPayload): void {
  const key = fingerprint(payload);
  const now = Date.now();
  const seenAt = queue.fingerprintSeen.get(key);
  if (seenAt && now - seenAt < DEDUPE_WINDOW_MS) return;

  queue.fingerprintSeen.set(key, now);
  queue.items.push({ payload, receivedAt: now });
}

function rawWebhook(payload: EvolutionWebhookPayload): RawWebhook {
  return (payload ?? {}) as RawWebhook;
}

function webhookEventName(payload: EvolutionWebhookPayload): string {
  const raw = rawWebhook(payload);
  return String(raw.event ?? raw.type ?? "").toLowerCase();
}

function webhookStatus(payload: EvolutionWebhookPayload): string | null {
  const raw = rawWebhook(payload);
  const status =
    raw.data?.update?.status ??
    raw.data?.update?.messageStatus ??
    raw.data?.status ??
    raw.update?.status ??
    raw.update?.messageStatus ??
    raw.data?.messageStatus ??
    raw.messageStatus ??
    raw.status;
  return status ? String(status).toLowerCase() : null;
}

function webhookExternalId(payload: EvolutionWebhookPayload): string | null {
  const raw = rawWebhook(payload);
  return (
    raw.data?.key?.id ??
    raw.data?.message?.conversation ??
    raw.data?.key?.remoteJidAlt ??
    raw.data?.key?.remoteJid ??
    raw.key?.id ??
    null
  );
}

function isStatusUpdate(payload: EvolutionWebhookPayload): boolean {
  const name = webhookEventName(payload);
  const status = webhookStatus(payload);
  return name.includes("update") || Boolean(status);
}

function isUpsert(payload: EvolutionWebhookPayload): boolean {
  const name = webhookEventName(payload);
  return name.includes("upsert") || name === "send_message" || !isStatusUpdate(payload);
}

function cleanupFingerprintCache(): void {
  const now = Date.now();
  for (const [key, seenAt] of queue.fingerprintSeen) {
    if (now - seenAt > DEDUPE_WINDOW_MS) {
      queue.fingerprintSeen.delete(key);
    }
  }
}

async function persistConversation(params: {
  tenancyId: string;
  phone: string;
  contactName?: string;
  classification: string | null;
  lastMessageAt: Date;
}) {
  const { tenancyId, phone, contactName, classification, lastMessageAt } = params;
  if (!prisma) {
    return {
      id: randomUUID(),
      tenancyId,
      phone,
      contactName: contactName ?? null,
    };
  }

  return prisma.whatsappConversation.upsert({
    where: {
      tenancyId_phone: {
        tenancyId,
        phone,
      },
    },
    update: {
      lastMessageAt,
      triageClassification: classification as never,
      ...(contactName !== undefined ? { contactName } : {}),
    },
    create: {
      id: randomUUID(),
      tenancyId,
      clientId: null,
      phone,
      contactName: contactName ?? null,
      lastMessageAt,
      assignedToUserId: null,
      status: "aberta",
      triageClassification: classification as never,
      createdBy: null,
    },
  });
}

async function persistMessage(params: {
  tenancyId: string;
  conversationId: string;
  direction: "in" | "out";
  body: string;
  mediaUrl?: string | null;
  externalId: string;
  sentAt: Date;
  sentBy: "user" | "system" | "ai" | "bot";
  templateKey?: string | null;
}) {
  const {
    tenancyId,
    conversationId,
    direction,
    body,
    mediaUrl,
    externalId,
    sentAt,
    sentBy,
    templateKey,
  } = params;

  if (!prisma) {
    return {
      id: randomUUID(),
      tenancyId,
      conversationId,
      direction,
      body,
      mediaUrl: mediaUrl ?? null,
      templateKey: templateKey ?? null,
      externalId,
      sentAt: sentAt.toISOString(),
      deliveredAt: sentAt.toISOString(),
      readAt: null,
      sentBy,
    };
  }

  return prisma.whatsappMessage.upsert({
    where: {
      tenancyId_externalId: {
        tenancyId,
        externalId,
      },
    },
    update: {
      conversationId,
      direction,
      body,
      mediaUrl: mediaUrl ?? null,
      templateKey: templateKey ?? null,
      sentAt,
      sentBy,
    },
    create: {
      id: randomUUID(),
      tenancyId,
      conversationId,
      direction,
      body,
      mediaUrl: mediaUrl ?? null,
      templateKey: templateKey ?? null,
      externalId,
      sentAt,
      deliveredAt: sentAt,
      readAt: null,
      sentBy,
      createdBy: null,
    },
  });
}

async function applyStatusUpdate(payload: EvolutionWebhookPayload): Promise<void> {
  const externalId = webhookExternalId(payload);
  const status = webhookStatus(payload);
  if (!externalId || !status || !prisma) return;

  const now = new Date();
  const delivered = status.includes("deliver") || status.includes("sent") || status.includes("read");
  const read = status.includes("read");

  const result = await prisma.whatsappMessage.updateMany({
    where: {
      tenancyId: defaultSystemTenancyId(),
      externalId,
    },
    data: {
      ...(delivered ? { deliveredAt: now } : {}),
      ...(read ? { readAt: now } : {}),
    },
  });

  if (result.count > 0) {
    publishWhatsAppEvent({
      type: "message.update",
      tenancyId: defaultSystemTenancyId(),
      conversationId: "",
      externalId,
      status,
    });
  }
}

async function handleUpsert(payload: EvolutionWebhookPayload): Promise<void> {
  const adapter = getWhatsAppAdapter();
  const inbound = adapter.parseWebhook(payload) as InboundMessage | null;
  if (!inbound) return;

  const ctx = systemCtx();
  const classification = inbound.fromMe
    ? null
    : (await triageInbound(ctx, inbound.body)).classification;
  const contactName = inbound.fromMe ? undefined : inbound.name;
  const conversation = await persistConversation({
    tenancyId: ctx.tenancyId,
    phone: inbound.phone,
    contactName,
    classification,
    lastMessageAt: new Date(inbound.timestamp),
  });

  const storedMessage = await persistMessage({
    tenancyId: ctx.tenancyId,
    conversationId: conversation.id,
    direction: inbound.fromMe ? "out" : "in",
    body: inbound.body,
    mediaUrl: inbound.mediaUrl ?? null,
    externalId: inbound.externalId,
    sentAt: new Date(inbound.timestamp),
    sentBy: inbound.fromMe ? "user" : "user",
  });

  publishWhatsAppEvent({
    type: "message.upsert",
    tenancyId: ctx.tenancyId,
    conversationId: conversation.id,
  });

  if (process.env.WHATSAPP_AI_AUTOREPLY === "true" && !inbound.fromMe) {
    try {
      const reply = await generateReply(inbound.body, classification);
      const sent = await adapter.sendMessage(inbound.phone, reply);
      await persistMessage({
        tenancyId: ctx.tenancyId,
        conversationId: conversation.id,
        direction: "out",
        body: reply,
        externalId: sent.externalId,
        sentAt: new Date(),
        sentBy: "bot",
      });
      publishWhatsAppEvent({ type: "message.upsert", tenancyId: ctx.tenancyId, conversationId: conversation.id });
    } catch (error) {
      console.error("[whatsapp-service] auto-reply failed:", error);
    }
  }

  void storedMessage;
}

async function processQueue(): Promise<void> {
  if (queue.running) return;
  queue.running = true;

  try {
    while (queue.items.length > 0) {
      const item = queue.items.shift();
      if (!item) continue;

      try {
        if (isStatusUpdate(item.payload)) {
          await applyStatusUpdate(item.payload);
        } else if (isUpsert(item.payload)) {
          await handleUpsert(item.payload);
        }
      } catch (error) {
        console.error("[whatsapp-service] background processing failed:", error);
      }
    }
  } finally {
    queue.running = false;
    cleanupFingerprintCache();
  }
}

export function processWhatsAppWebhook(payload: EvolutionWebhookPayload): void {
  queuePayload(payload);
  void Promise.resolve().then(processQueue).catch((error) => {
    console.error("[whatsapp-service] queue scheduling failed:", error);
  });
}