// Manual reconciliation (fallback when there is no gateway webhook). Body:
// { chargeId }. Marks the charge paid → installment paid → repasse, idempotently.
import { NextResponse } from "next/server";
import { z } from "zod";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({ chargeId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const charge = await billingRepository.markPaidManually(ctx, parsed.data.chargeId);
  if (!charge) {
    return NextResponse.json(
      { error: "Cobrança não encontrada." },
      { status: 404 },
    );
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "mark_paid",
    entityType: "charge",
    entityId: charge.id,
    payloadBefore: null,
    payloadAfter: charge as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, charge });
}
