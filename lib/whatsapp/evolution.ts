// Evolution API implementation of the WhatsApp adapter. Configured via env:
// EVOLUTION_API_URL, EVOLUTION_API_TOKEN, EVOLUTION_INSTANCE. In mock mode (no
// env) sends return a fake externalId so the app stays usable end-to-end.
import type {
  WhatsAppAdapter,
  InboundMessage,
  ConnectionInfo,
  ImportedChat,
} from "./adapter";
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
    key?: {
      id?: string;
      remoteJid?: string;
      // Newer WhatsApp uses LID addressing: remoteJid is an anonymous "<n>@lid"
      // and the real phone JID is carried in remoteJidAlt.
      remoteJidAlt?: string;
      fromMe?: boolean;
    };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    messageTimestamp?: number;
    pushName?: string;
  };
}

type EvolutionKey = NonNullable<NonNullable<EvolutionWebhook["data"]>["key"]>;

// Shapes returned by /chat/findChats and /chat/findMessages (subset we use).
interface EvolutionChat {
  remoteJid?: string;
  pushName?: string | null;
  updatedAt?: string;
  lastMessage?: { key?: { remoteJidAlt?: string } };
}
interface EvolutionMessageRecord {
  key?: { id?: string; fromMe?: boolean };
  pushName?: string | null;
  message?: { conversation?: string; extendedTextMessage?: { text?: string } };
  messageTimestamp?: number;
}

// Extract the dialable phone JID, preferring the real-number alt over a @lid.
function resolvePhoneJid(key?: EvolutionKey): string | null {
  if (!key) return null;
  const candidates = [key.remoteJidAlt, key.remoteJid].filter(Boolean) as string[];
  // Prefer an @s.whatsapp.net jid (real phone) over @lid / @g.us / status.
  const real = candidates.find((j) => j.endsWith("@s.whatsapp.net"));
  return real ?? candidates[0] ?? null;
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

  async importChats(sinceMs: number, perChat: number): Promise<ImportedChat[]> {
    if (!isWhatsAppConfigured()) return [];
    const chats = (await this.post2(`/chat/findChats/${this.instance}`, {})) as EvolutionChat[];
    if (!Array.isArray(chats)) return [];

    // Keep personal chats with a resolvable real number, active since `sinceMs`.
    const since = Date.now() - sinceMs;
    const wanted = chats.filter((c) => {
      const jid = c.remoteJid ?? "";
      if (jid.endsWith("@g.us") || jid.includes("status@")) return false;
      const updated = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      if (updated < since) return false;
      return Boolean(this.chatPhone(c));
    });

    const out: ImportedChat[] = [];
    for (const c of wanted) {
      const phone = this.chatPhone(c);
      if (!phone) continue;
      const messages = await this.fetchChatMessages(c.remoteJid ?? "", phone, perChat);
      out.push({ phone, name: c.pushName ?? undefined, messages });
    }
    return out;
  }

  // POST that returns the raw JSON body (findChats returns an array, not {key}).
  private async post2(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: this.token },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Evolution ${res.status}: ${await res.text()}`);
    return res.json();
  }

  // Resolve a chat's dialable phone (digits only) from its jid / lastMessage alt.
  private chatPhone(c: EvolutionChat): string | null {
    const alt = c.lastMessage?.key?.remoteJidAlt;
    const jid =
      alt && alt.endsWith("@s.whatsapp.net")
        ? alt
        : c.remoteJid?.endsWith("@s.whatsapp.net")
          ? c.remoteJid
          : null;
    return jid ? jid.replace(/@.*$/, "") : null;
  }

  private async fetchChatMessages(
    remoteJid: string,
    phone: string,
    limit: number,
  ): Promise<InboundMessage[]> {
    if (!remoteJid) return [];
    const data = (await this.post2(`/chat/findMessages/${this.instance}`, {
      where: { key: { remoteJid } },
    })) as { messages?: { records?: EvolutionMessageRecord[] } };
    const records = data?.messages?.records ?? [];
    // Records come newest-first; take the most recent `limit` and order ascending.
    const recent = records.slice(0, limit).reverse();
    const out: InboundMessage[] = [];
    for (const r of recent) {
      const body = r.message?.conversation ?? r.message?.extendedTextMessage?.text;
      if (!body) continue;
      out.push({
        phone,
        body,
        name: r.pushName ?? undefined,
        externalId: r.key?.id ?? `imp-${Date.now()}-${Math.random()}`,
        timestamp: r.messageTimestamp
          ? new Date(r.messageTimestamp * 1000).toISOString()
          : new Date().toISOString(),
        fromMe: Boolean(r.key?.fromMe),
      });
    }
    return out;
  }

  sendTemplate(to: string, templateKey: string, vars: Record<string, string>) {
    const text = renderTemplate(templateKey as TemplateKey, vars);
    return this.sendMessage(to, text);
  }

  parseWebhook(payload: unknown): InboundMessage | null {
    const p = payload as EvolutionWebhook;
    const data = p?.data;
    const key = data?.key;
    const body = data?.message?.conversation ?? data?.message?.extendedTextMessage?.text;
    if (!key || !body) return null;
    // Ignore our own outbound echoes (avoids reply loops).
    if (key.fromMe) return null;
    // Resolve the real phone JID. Newer WhatsApp delivers remoteJid as "<n>@lid"
    // with the real number in remoteJidAlt — accept both LID and standard JIDs.
    const jid = resolvePhoneJid(key);
    if (!jid) return null;
    // Drop non-personal chats: groups, status/broadcast, newsletters.
    if (jid.endsWith("@g.us") || jid.endsWith("@broadcast") || jid.includes("status@")) {
      return null;
    }
    const phone = jid.replace(/@.*$/, "");
    // A real phone is digits only (LID values can leak through if there is no
    // alt; we still keep them so the conversation is captured).
    return {
      phone,
      body,
      name: data?.pushName?.trim() || undefined,
      externalId: key.id ?? `in-${Date.now()}`,
      timestamp: data?.messageTimestamp
        ? new Date(data.messageTimestamp * 1000).toISOString()
        : new Date().toISOString(),
    };
  }
}
