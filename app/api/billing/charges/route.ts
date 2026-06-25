// Emit a charge (boleto/PIX) for a rental installment. Body: { installmentId,
// method }. Runs under the caller's tenancy context.
import { NextResponse } from "next/server";
import { z } from "zod";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { getSessionUser } from "@/lib/session";

const bodySchema = z.object({
  installmentId: z.string().min(1),
  method: z.enum(["boleto", "pix", "cartao"]),
});

export async function POST(request: Request) {
  const user = getSessionUser();
  const ctx = { tenancyId: user.tenancyId, userId: user.id };

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const charge = await billingRepository.emitForInstallment(
    ctx,
    parsed.data.installmentId,
    parsed.data.method,
  );
  if (!charge) {
    return NextResponse.json(
      { error: "Parcela não encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, charge });
}
