// Resolve the active billing adapter. Defaults to the deterministic mock; selects
// Asaas when ASAAS_API_KEY is configured. Mirrors getWhatsAppAdapter / aiProvider.

import type { BillingAdapter } from "./provider";
import { MockBillingAdapter } from "./mock";
import { AsaasBillingAdapter } from "./asaas";
import { isBillingConfigured } from "@/lib/constants";

export function getBillingAdapter(): BillingAdapter {
  if (isBillingConfigured()) return new AsaasBillingAdapter();
  return new MockBillingAdapter();
}
