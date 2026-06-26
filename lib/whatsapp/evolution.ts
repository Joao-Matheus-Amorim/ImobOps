// Evolution API implementation of the WhatsApp adapter. Configured via env:
// EVOLUTION_API_URL, EVOLUTION_API_TOKEN, EVOLUTION_INSTANCE. In mock mode (no
// env) sends return a fake externalId so the app stays usable end-to-end.
import type { WhatsAppAdapter, InboundMessage } from "./adapter";
import { renderTemplate, type TemplateKey } from "./templates";
import { isWhatsAppConfigured } from "@/lib/constants";

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

  sendMessage(to: string, body: string, _mediaUrl?: string) {
    return this.post(`/message/sendText/${this.instance}`, { number: to, text: body });
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
