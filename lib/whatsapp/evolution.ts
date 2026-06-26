// Evolution API implementation of the WhatsApp adapter. Configured via env:
// EVOLUTION_API_URL, EVOLUTION_API_TOKEN, EVOLUTION_INSTANCE. In mock mode (no
// env) sends return a fake externalId so the app stays usable end-to-end.
import type { WhatsAppAdapter, InboundMessage, ConnectionInfo } from "./adapter";
import { renderTemplate, type TemplateKey } from "./templates";
import { isWhatsAppConfigured } from "@/lib/constants";

function normalizeState(state?: string): ConnectionInfo["state"] {
  if (state === "open") return "open";
  if (state === "connecting") return "connecting";
  if (state === "close") return "close";
  return "unknown";
}

interface EvolutionWebhook {
  data?: {
    key?: { id?: string; remoteJid?: string; fromMe?: boolean };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    messageTimestamp?: number;
  };
}

export class EvolutionAdapter implements WhatsAppAdapter {
  constructor(
    private readonly baseUrl = process.env.EVOLUTION_API_URL ?? "",
    private readonly token = process.env.EVOLUTION_API_TOKEN ?? "",
    private readonly instance = process.env.EVOLUTION_INSTANCE ?? "default",
  ) {}

  private async post(path: string, body: unknown): Promise<{ externalId: string }> {
    if (!isWhatsAppConfigured()) {
      // Mock: pretend it was sent.
      return { externalId: `mock-${Date.now()}` };
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: this.token },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Evolution ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { key?: { id?: string } };
    return { externalId: data.key?.id ?? `evo-${Date.now()}` };
  }

  private async get(path: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { apikey: this.token },
    });
    if (!res.ok) throw new Error(`Evolution ${res.status}: ${await res.text()}`);
    return res.json();
  }

  private async del(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: { apikey: this.token },
    });
    if (!res.ok) throw new Error(`Evolution ${res.status}: ${await res.text()}`);
  }

  sendMessage(to: string, body: string, _mediaUrl?: string) {
    return this.post(`/message/sendText/${this.instance}`, { number: to, text: body });
  }

  async connectionState(): Promise<ConnectionInfo> {
    if (!isWhatsAppConfigured()) return { state: "open", qr: null };
    const data = (await this.get(`/instance/connectionState/${this.instance}`)) as {
      instance?: { state?: string };
    };
    return { state: normalizeState(data.instance?.state), qr: null };
  }

  async connect(): Promise<ConnectionInfo> {
    if (!isWhatsAppConfigured()) return { state: "open", qr: null };
    // Evolution returns either { instance: { state } } when already connected,
    // or a pairing payload with base64/code when a scan is needed.
    const data = (await this.get(`/instance/connect/${this.instance}`)) as {
      instance?: { state?: string };
      base64?: string;
      code?: string;
    };
    if (data.instance?.state) {
      return { state: normalizeState(data.instance.state), qr: null };
    }
    const qr = data.base64
      ? data.base64.startsWith("data:")
        ? data.base64
        : `data:image/png;base64,${data.base64}`
      : null;
    return { state: "connecting", qr };
  }

  async disconnect(): Promise<ConnectionInfo> {
    if (!isWhatsAppConfigured()) return { state: "close", qr: null };
    await this.del(`/instance/logout/${this.instance}`);
    return { state: "close", qr: null };
  }

  sendTemplate(to: string, templateKey: string, vars: Record<string, string>) {
    const text = renderTemplate(templateKey as TemplateKey, vars);
    return this.sendMessage(to, text);
  }

  parseWebhook(payload: unknown): InboundMessage | null {
    const p = payload as EvolutionWebhook;
    const data = p?.data;
    const remoteJid = data?.key?.remoteJid;
    const body = data?.message?.conversation ?? data?.message?.extendedTextMessage?.text;
    if (!remoteJid || !body) return null;
    // Ignore our own outbound echoes (avoids reply loops), and any non-personal
    // chat (groups, status/broadcast, newsletters) — only individual @s.whatsapp.net.
    if (data?.key?.fromMe) return null;
    if (!remoteJid.endsWith("@s.whatsapp.net")) return null;
    return {
      phone: remoteJid.replace(/@.*$/, ""),
      body,
      externalId: data?.key?.id ?? `in-${Date.now()}`,
      timestamp: data?.messageTimestamp
        ? new Date(data.messageTimestamp * 1000).toISOString()
        : new Date().toISOString(),
    };
  }
}
