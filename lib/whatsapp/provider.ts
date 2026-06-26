// Resolve the active WhatsApp adapter. Evolution stays the default. Meta only
// takes over when explicitly selected (WHATSAPP_PROVIDER=meta) AND its
// credentials are present — so flipping the flag without configuring the Meta
// env never silently breaks the working Evolution setup.
import type { WhatsAppAdapter } from "./adapter";
import { EvolutionAdapter } from "./evolution";
import { MetaAdapter } from "./meta";

function metaConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_META_TOKEN && process.env.WHATSAPP_META_PHONE_ID);
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (process.env.WHATSAPP_PROVIDER === "meta" && metaConfigured()) {
    return new MetaAdapter();
  }
  return new EvolutionAdapter();
}
