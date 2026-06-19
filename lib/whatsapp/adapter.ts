// WhatsApp adapter interface. Implementations: Evolution API (default) and a typed
// Meta Business API stub. Selected by configuration.

export interface InboundMessage {
  phone: string;
  body: string;
  mediaUrl?: string;
  externalId: string;
  timestamp: string;
}

export interface WhatsAppAdapter {
  sendMessage(to: string, body: string, mediaUrl?: string): Promise<{ externalId: string }>;
  sendTemplate(
    to: string,
    templateKey: string,
    vars: Record<string, string>,
  ): Promise<{ externalId: string }>;
  parseWebhook(payload: unknown): InboundMessage | null;
}
