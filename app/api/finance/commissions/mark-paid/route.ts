// Record a commission payment (internal control — not a gateway charge). The
// commission is what the agency pays the broker, so this only flips status →
// paga + sets paidAt. Body: { commissionId }.
import { NextResponse } from "next/server";
import { z } from "zod";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({ commissionId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const commission = await financeRepository.recordCommissionPayment(
    ctx,
    parsed.data.commissionId,
  );
  if (!commission) {
    return NextResponse.json(
      { error: "Comissão não encontrada." },
      { status: 404 },
    );
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "mark_paid",
    entityType: "commission",
    entityId: commission.id,
    payloadBefore: null,
    payloadAfter: commission as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, commission });
}
