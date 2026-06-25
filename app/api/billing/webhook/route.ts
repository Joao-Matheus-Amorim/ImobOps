// Inbound payment webhook (Asaas). Validates the token, normalizes the event via
// the active adapter, and reconciles the charge idempotently — paying it marks the
// installment paid and triggers the repasse. Mirrors app/api/whatsapp/webhook.
import { NextResponse } from "next/server";
import { getBillingAdapter } from "@/lib/billing/adapter";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { DEMO_TENANCY_ID } from "@/lib/constants";

// Single-tenant mode: all events belong to the demo tenancy. In SaaS mode the
// gateway account → tenancy mapping resolves this.
const SYSTEM_CTX = { tenancyId: DEMO_TENANCY_ID, userId: "system" };

function tokenValid(request: Request): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) return false; // misconfigured → reject, never accept blindly
  return request.headers.get("asaas-access-token") === expected;
}

export async function POST(request: Request) {
  if (!tokenValid(request)) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const event = getBillingAdapter().parseWebhook(payload);
  if (!event) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (event.event !== "paid") {
    // Refunds/failures are acknowledged; status handling beyond payment is a
    // later cut. Ack so the gateway stops retrying.
    return NextResponse.json({ ok: true, event: event.event });
  }

  const charge = await billingRepository.reconcileByExternalId(
    SYSTEM_CTX,
    event.externalId,
    event.paidAmount,
    event.paidAt,
  );

  if (!charge) {
    // Unknown charge — ack to avoid infinite retries, but flag it.
    return NextResponse.json({ ok: true, matched: false });
  }

  return NextResponse.json({ ok: true, matched: true, status: charge.status });
}
