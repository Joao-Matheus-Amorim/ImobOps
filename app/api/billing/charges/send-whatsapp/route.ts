// Send a charge (boleto/PIX) to its client over WhatsApp. Body: { chargeId }.
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

  const result = await billingRepository.sendChargeWhatsApp(
    ctx,
    parsed.data.chargeId,
  );
  if (!result.sent) {
    return NextResponse.json(
      { error: result.reason ?? "Não foi possível enviar." },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true });
}
