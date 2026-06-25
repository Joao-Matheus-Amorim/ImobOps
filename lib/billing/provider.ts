// Billing adapter interface. Implementations: Asaas (real) and a deterministic
// mock (default, no env). Selected by configuration — mirrors lib/whatsapp and
// lib/ai. No business logic lives here; the repository owns the domain flow.

import type { ChargeMethod } from "@/lib/types/domain";

// Request to create a charge at the gateway.
export interface CreateChargeRequest {
  // Stable local reference (installment id) — lets the gateway echo it back and
  // makes reconciliation idempotent.
  reference: string;
  method: ChargeMethod;
  amount: number;
  dueDate: string; // yyyy-mm-dd
  customerName?: string;
  customerDocument?: string; // cpf/cnpj
  description?: string;
}

// Result of a successful charge creation at the gateway.
export interface CreateChargeResult {
  externalId: string;
  boletoUrl: string | null;
  pixPayload: string | null;
}

// Normalized payment event parsed from a gateway webhook.
export interface PaymentEvent {
  externalId: string; // gateway charge id
  reference: string | null; // our installment id, when echoed back
  paidAmount: number;
  paidAt: string; // ISO
  event: "paid" | "refunded" | "failed";
}

export interface BillingAdapter {
  readonly provider: "asaas" | "mock";
  createCharge(req: CreateChargeRequest): Promise<CreateChargeResult>;
  cancelCharge(externalId: string): Promise<void>;
  parseWebhook(payload: unknown): PaymentEvent | null;
}
