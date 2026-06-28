import { getWhatsAppRedis } from "@/lib/whatsapp/redis-client";

// Pub/sub for WhatsApp inbox real-time updates. Redis is used when Upstash is
// configured, with an in-memory bus as the explicit dev/test fallback.

export interface WhatsAppEvent {
  type: "message.upsert" | "message.update" | "ready";
  tenancyId: string;
  conversationId: string;
  externalId?: string;
  status?: string;
}

type Listener = (event: WhatsAppEvent) => void;
type Subscriber = ReturnType<NonNullable<ReturnType<typeof getWhatsAppRedis>>["psubscribe"]>;

// Survive Next.js dev hot-reload by stashing the bus on globalThis.
const globalForBus = globalThis as unknown as {
  __whatsappListeners?: Set<Listener>;
  __whatsappRedisSubscriber?: Subscriber;
  __whatsappRedisSubscriberRefs?: number;
};
const listeners = (globalForBus.__whatsappListeners ??= new Set<Listener>());

const CHANNEL_PREFIX = "imobops:whatsapp";
const ALL_TENANCIES_PATTERN = `${CHANNEL_PREFIX}:*`;

function channelForTenancy(tenancyId: string): string {
  return `${CHANNEL_PREFIX}:${tenancyId}`;
}

function deliverLocal(event: WhatsAppEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // a broken subscriber must not break the publisher
    }
  }
}

function ensureRedisSubscriber(): boolean {
  const redis = getWhatsAppRedis();
  if (!redis) return false;
  if (globalForBus.__whatsappRedisSubscriber) return true;

  try {
    const subscriber = redis.psubscribe<WhatsAppEvent>(ALL_TENANCIES_PATTERN);
    subscriber.on("pmessage", ({ message }) => {
      deliverLocal(message);
    });
    subscriber.on("error", (error) => {
      console.error("WhatsApp Redis pub/sub subscription failed", error);
    });
    globalForBus.__whatsappRedisSubscriber = subscriber;
    globalForBus.__whatsappRedisSubscriberRefs = 0;
    return true;
  } catch (error) {
    console.error("WhatsApp Redis pub/sub setup failed", error);
    return false;
  }
}

export function publishWhatsAppEvent(event: WhatsAppEvent): void {
  const redis = getWhatsAppRedis();
  if (!redis) {
    deliverLocal(event);
    return;
  }

  redis.publish(channelForTenancy(event.tenancyId), event).catch((error: unknown) => {
    console.error("WhatsApp Redis pub/sub publish failed", error);
    deliverLocal(event);
  });
}

export function subscribeWhatsAppEvents(listener: Listener): () => void {
  listeners.add(listener);
  const usingRedis = ensureRedisSubscriber();
  if (usingRedis) {
    globalForBus.__whatsappRedisSubscriberRefs =
      (globalForBus.__whatsappRedisSubscriberRefs ?? 0) + 1;
  }

  return () => {
    listeners.delete(listener);
    if (!usingRedis) return;

    globalForBus.__whatsappRedisSubscriberRefs = Math.max(
      0,
      (globalForBus.__whatsappRedisSubscriberRefs ?? 1) - 1,
    );
    if (globalForBus.__whatsappRedisSubscriberRefs > 0) return;

    const subscriber = globalForBus.__whatsappRedisSubscriber;
    globalForBus.__whatsappRedisSubscriber = undefined;
    subscriber?.unsubscribe().catch((error: unknown) => {
      console.error("WhatsApp Redis pub/sub unsubscribe failed", error);
    });
  };
}
