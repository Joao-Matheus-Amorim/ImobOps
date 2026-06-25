// Deterministic mock billing adapter. Used whenever ASAAS_API_KEY is absent — the
// app runs the full billing flow with no external dependency, exactly like the
// WhatsApp/AI mock paths. Payloads are stable per reference so tests can assert.

import type {
  BillingAdapter,
  CreateChargeRequest,
  CreateChargeResult,
  PaymentEvent,
} from "./provider";

function externalIdFor(reference: string): string {
  return `mock_chg_${reference}`;
}

export class MockBillingAdapter implements BillingAdapter {
  readonly provider = "mock" as const;

  async createCharge(req: CreateChargeRequest): Promise<CreateChargeResult> {
    const externalId = externalIdFor(req.reference);
    return {
      externalId,
      boletoUrl:
        req.method === "boleto"
          ? `https://mock.billing.local/boleto/${externalId}.pdf`
          : null,
      pixPayload:
        req.method === "pix"
          ? `00020126MOCKPIX-${externalId}-${req.amount.toFixed(2)}`
          : null,
    };
  }

  async cancelCharge(_externalId: string): Promise<void> {
    // No-op in mock.
  }

  // Accepts a minimal normalized shape so the webhook route can be exercised in
  // tests/dev without a real gateway payload.
  parseWebhook(payload: unknown): PaymentEvent | null {
    if (!payload || typeof payload !== "object") return null;
    const p = payload as Record<string, unknown>;
    const externalId = typeof p.externalId === "string" ? p.externalId : null;
    if (!externalId) return null;
    const rawEvent = typeof p.event === "string" ? p.event : "paid";
    const event: PaymentEvent["event"] =
      rawEvent === "refunded" || rawEvent === "failed" ? rawEvent : "paid";
    return {
      externalId,
      reference: typeof p.reference === "string" ? p.reference : null,
      paidAmount: typeof p.paidAmount === "number" ? p.paidAmount : 0,
      paidAt: typeof p.paidAt === "string" ? p.paidAt : new Date().toISOString(),
      event,
    };
  }
}
