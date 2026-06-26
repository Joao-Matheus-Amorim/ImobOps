// Meta (WhatsApp Cloud) Business API adapter. The official, stable path for
// production: no phone session, no QR, no ban risk. Selected via
// WHATSAPP_PROVIDER=meta. Configure with:
//   WHATSAPP_META_TOKEN        — permanent access token (System User token)
//   WHATSAPP_META_PHONE_ID     — the Phone Number ID (not the phone number)
//   WHATSAPP_META_VERIFY_TOKEN — your own string, used to verify the webhook (GET)
// See docs/PRODUCTION_RUNBOOK.md for the full setup.
import type {
  WhatsAppAdapter,
  InboundMessage,
  ConnectionInfo,
  ImportedChat,
} from "./adapter";
import { renderTemplate, type TemplateKey } from "./templates";

const GRAPH_VERSION = "v21.0";

// Subset of the Meta webhook payload we read.
interface MetaWebhook {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          image?: { caption?: string };
          video?: { caption?: string };
          document?: { caption?: string; filename?: string };
          audio?: unknown;
          sticker?: unknown;
          location?: unknown;
          contacts?: unknown;
        }>;
      };
    }>;
  }>;
}

function mediaPlaceholder(type?: string): string | null {
  switch (type) {
    case "image":
      return "📷 Imagem";
    case "video":
      return "🎥 Vídeo";
    case "audio":
      return "🎵 Áudio";
    case "sticker":
      return "💬 Figurinha";
    case "document":
      return "📄 Documento";
    case "contacts":
      return "👤 Contato";
    case "location":
      return "📍 Localização";
    default:
      return null;
  }
}

export class MetaAdapter implements WhatsAppAdapter {
  constructor(
    private readonly token = process.env.WHATSAPP_META_TOKEN ?? "",
    private readonly phoneId = process.env.WHATSAPP_META_PHONE_ID ?? "",
  ) {}

  private configured(): boolean {
    return Boolean(this.token && this.phoneId);
  }

  private async post(body: unknown): Promise<{ externalId: string }> {
    if (!this.configured()) {
      // Mock so the app stays usable without credentials.
      return { externalId: `mock-meta-${Date.now()}` };
    }
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneId}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...(body as object) }),
      },
    );
    if (!res.ok) throw new Error(`Meta ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { messages?: Array<{ id?: string }> };
    return { externalId: data.messages?.[0]?.id ?? `meta-${Date.now()}` };
  }

  // Plain free-form text. Only allowed within the 24h customer-service window;
  // outside it, use sendTemplate (an approved template).
  sendMessage(to: string, body: string, _mediaUrl?: string) {
    return this.post({
      to,
      type: "text",
      text: { preview_url: false, body },
    });
  }

  // Meta requires pre-approved templates for business-initiated messages. Here we
  // render our local template text and send it as free-form — works inside the
  // 24h window. For true approved templates, map TemplateKey → Meta template name
  // + components (documented in the runbook) and switch type to "template".
  sendTemplate(to: string, templateKey: string, vars: Record<string, string>) {
    const text = renderTemplate(templateKey as TemplateKey, vars);
    return this.sendMessage(to, text);
  }

  // Parse one inbound message from the Meta webhook. The route should call this
  // once per message in entry[].changes[].value.messages.
  parseWebhook(payload: unknown): InboundMessage | null {
    const p = payload as MetaWebhook;
    const value = p?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg || !msg.from) return null;

    const body =
      msg.text?.body ??
      msg.image?.caption ??
      msg.video?.caption ??
      msg.document?.caption ??
      mediaPlaceholder(msg.type);
    if (!body) return null;

    const name = value?.contacts?.[0]?.profile?.name;
    const tsSec = Number(msg.timestamp);
    return {
      phone: msg.from, // Meta already gives the dialable number (e.g. 5521...)
      body,
      name: name?.trim() || undefined,
      externalId: msg.id ?? `meta-in-${Date.now()}`,
      timestamp: Number.isFinite(tsSec)
        ? new Date(tsSec * 1000).toISOString()
        : new Date().toISOString(),
      fromMe: false, // Meta webhooks deliver inbound (customer) messages only
    };
  }

  // Meta uses a permanent token — always "connected", no QR pairing.
  async connectionState(): Promise<ConnectionInfo> {
    return { state: this.configured() ? "open" : "close", qr: null };
  }
  async connect(): Promise<ConnectionInfo> {
    return { state: this.configured() ? "open" : "close", qr: null };
  }
  async disconnect(): Promise<ConnectionInfo> {
    return { state: "open", qr: null };
  }

  // The Cloud API does not expose chat history — nothing to import.
  async importChats(): Promise<ImportedChat[]> {
    return [];
  }
}

// Webhook verification handshake (GET): Meta calls the URL with hub.* params.
// Return the challenge when the verify token matches.
export function metaWebhookVerify(url: URL): { ok: boolean; challenge?: string } {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") ?? undefined;
  const expected = process.env.WHATSAPP_META_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected) {
    return { ok: true, challenge };
  }
  return { ok: false };
}
