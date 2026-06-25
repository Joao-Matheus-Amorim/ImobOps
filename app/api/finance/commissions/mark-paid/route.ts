// Record a commission payment (internal control — not a gateway charge). The
// commission is what the agency pays the broker, so this only flips status →
// paga + sets paidAt. Body: { commissionId }.
import { NextResponse } from "next/server";
import { z } from "zod";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { getSessionUser } from "@/lib/session";

const bodySchema = z.object({ commissionId: z.string().min(1) });

export async function POST(request: Request) {
  const user = getSessionUser();
  const ctx = { tenancyId: user.tenancyId, userId: user.id };

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const commission = financeRepository.recordCommissionPayment(
    ctx,
    parsed.data.commissionId,
  );
  if (!commission) {
    return NextResponse.json(
      { error: "Comissão não encontrada." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, commission });
}
