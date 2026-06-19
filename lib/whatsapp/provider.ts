// Resolve the active WhatsApp adapter. Defaults to Evolution API (which itself
// degrades to mock when env is missing). Switch to Meta via WHATSAPP_PROVIDER=meta.
import type { WhatsAppAdapter } from "./adapter";
import { EvolutionAdapter } from "./evolution";
import { MetaAdapter } from "./meta";

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (process.env.WHATSAPP_PROVIDER === "meta") return new MetaAdapter();
  return new EvolutionAdapter();
}
