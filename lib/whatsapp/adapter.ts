// WhatsApp adapter interface. Implementations: Evolution API (default) and a typed
// Meta Business API stub. Selected by configuration.

export interface InboundMessage {
  phone: string;
  body: string;
  // Sender's WhatsApp display name (pushName), when provided.
  name?: string;
  mediaUrl?: string;
  externalId: string;
  timestamp: string;
  // True when this message was sent by us (import only — webhook drops fromMe).
  fromMe?: boolean;
}

// Connection state for the inbox "connect number" flow. `qr` is a base64 data
// URL when the provider needs a scan; null once connected (or when unsupported).
export interface ConnectionInfo {
  state: "open" | "connecting" | "close" | "unknown";
  qr: string | null;
}

// An existing conversation pulled from the provider for import, with its recent
// messages already normalized.
export interface ImportedChat {
  phone: string;
  name?: string;
  messages: InboundMessage[];
}

export interface WhatsAppAdapter {
  sendMessage(to: string, body: string, mediaUrl?: string): Promise<{ externalId: string }>;
  sendTemplate(
    to: string,
    templateKey: string,
    vars: Record<string, string>,
  ): Promise<{ externalId: string }>;
  parseWebhook(payload: unknown): InboundMessage | null;
  // Current connection state (no QR side effects).
  connectionState(): Promise<ConnectionInfo>;
  // Start/resume a connection, returning a QR to scan when not yet connected.
  connect(): Promise<ConnectionInfo>;
  // Log out the connected number (ends the WhatsApp session).
  disconnect(): Promise<ConnectionInfo>;
  // Pull existing personal conversations (active since `sinceMs`) with their
  // recent messages, for a one-off import into the inbox.
  importChats(sinceMs: number, perChat: number): Promise<ImportedChat[]>;
}
