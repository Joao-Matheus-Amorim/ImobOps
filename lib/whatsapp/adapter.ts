// WhatsApp adapter interface. Implementations: Evolution API (default) and a typed
// Meta Business API stub. Selected by configuration.

export interface InboundMessage {
  phone: string;
  body: string;
  mediaUrl?: string;
  externalId: string;
  timestamp: string;
}

// Connection state for the inbox "connect number" flow. `qr` is a base64 data
// URL when the provider needs a scan; null once connected (or when unsupported).
export interface ConnectionInfo {
  state: "open" | "connecting" | "close" | "unknown";
  qr: string | null;
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
}
