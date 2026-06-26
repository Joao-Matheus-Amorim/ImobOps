// In-memory pub/sub for WhatsApp inbox real-time updates. The webhook/send
// routes publish an event per tenancy; the SSE stream route subscribes and
// forwards events to connected browsers.
//
// This is a single-process bus: fine for one Next server (dev or a single
// instance). For multi-instance deploys, back it with Redis/Postgres LISTEN.

export interface WhatsAppEvent {
  type: "message.upsert" | "message.update" | "ready";
  tenancyId: string;
  conversationId: string;
  externalId?: string;
  status?: string;
}

type Listener = (event: WhatsAppEvent) => void;

// Survive Next.js dev hot-reload by stashing the bus on globalThis.
const globalForBus = globalThis as unknown as {
  __whatsappListeners?: Set<Listener>;
};
const listeners = (globalForBus.__whatsappListeners ??= new Set<Listener>());

export function publishWhatsAppEvent(event: WhatsAppEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // a broken subscriber must not break the publisher
    }
  }
}

export function subscribeWhatsAppEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
