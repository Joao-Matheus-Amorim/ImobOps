// Meta (WhatsApp Cloud) Business API adapter — typed stub. The migration path from
// Evolution API to Meta is documented in docs/WHATSAPP_INTEGRATION.md. Not yet
// implemented; methods throw so misconfiguration fails loudly.
import type { WhatsAppAdapter, InboundMessage, ConnectionInfo } from "./adapter";

export class MetaAdapter implements WhatsAppAdapter {
  async sendMessage(_to: string, _body: string, _mediaUrl?: string): Promise<{ externalId: string }> {
    throw new Error("Meta Business API ainda não implementada — use a Evolution API.");
  }

  async sendTemplate(
    _to: string,
    _templateKey: string,
    _vars: Record<string, string>,
  ): Promise<{ externalId: string }> {
    throw new Error("Meta Business API ainda não implementada — use a Evolution API.");
  }

  parseWebhook(_payload: unknown): InboundMessage | null {
    throw new Error("Meta Business API ainda não implementada — use a Evolution API.");
  }

  // Meta uses a permanent token, not a QR pairing, so it is always "connected"
  // from the inbox's point of view.
  async connectionState(): Promise<ConnectionInfo> {
    return { state: "open", qr: null };
  }

  async connect(): Promise<ConnectionInfo> {
    return { state: "open", qr: null };
  }

  async disconnect(): Promise<ConnectionInfo> {
    return { state: "open", qr: null };
  }
}
