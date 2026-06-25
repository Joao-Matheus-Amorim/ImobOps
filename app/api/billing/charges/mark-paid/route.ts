// Manual reconciliation (fallback when there is no gateway webhook). Body:
// { chargeId }. Marks the charge paid → installment paid → repasse, idempotently.
import { NextResponse } from "next/server";
import { z } from "zod";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { getSessionUser } from "@/lib/session";

const bodySchema = z.object({ chargeId: z.string().min(1) });

export async function POST(request: Request) {
  const user = getSessionUser();
  const ctx = { tenancyId: user.tenancyId, userId: user.id };

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const charge = billingRepository.markPaidManually(ctx, parsed.data.chargeId);
  if (!charge) {
    return NextResponse.json(
      { error: "Cobrança não encontrada." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, charge });
}
