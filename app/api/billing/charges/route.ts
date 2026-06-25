// Emit a charge (boleto/PIX) for a rental installment. Body: { installmentId,
// method }. Runs under the caller's tenancy context.
import { NextResponse } from "next/server";
import { z } from "zod";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { getSessionUser } from "@/lib/session";

const method = z.enum(["boleto", "pix", "cartao"]);

// Emit for a rental installment, a condo fee, or a standalone charge to a client.
const bodySchema = z.union([
  z.object({ installmentId: z.string().min(1), method }),
  z.object({ condoFeeId: z.string().min(1), method }),
  z.object({
    clientId: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use yyyy-mm-dd"),
    method,
    description: z.string().max(200).optional(),
  }),
]);

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

  const charge =
    "installmentId" in parsed.data
      ? await billingRepository.emitForInstallment(
          ctx,
          parsed.data.installmentId,
          parsed.data.method,
        )
      : "condoFeeId" in parsed.data
        ? await billingRepository.emitForCondoFee(
            ctx,
            parsed.data.condoFeeId,
            parsed.data.method,
          )
        : await billingRepository.emitStandalone(ctx, parsed.data);

  if (!charge) {
    return NextResponse.json(
      { error: "Parcela ou cliente não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, charge });
}
