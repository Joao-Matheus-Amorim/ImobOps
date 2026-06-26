// Generate monthly condo fees for every unit (one fee per unit for the month).
import { NextResponse } from "next/server";
import { z } from "zod";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "use yyyy-mm"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use yyyy-mm-dd"),
  amount: z.number().positive("Valor inválido."),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const condo = await condosRepository.get(ctx, params.id);
  if (!condo) {
    return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const fees = await condosRepository.generateFees(
    ctx,
    params.id,
    d.referenceMonth,
    d.dueDate,
    d.amount,
  );

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "condo_fee",
    entityId: params.id,
    payloadBefore: null,
    payloadAfter: { referenceMonth: d.referenceMonth, count: fees.length },
  });

  return NextResponse.json({ ok: true, count: fees.length });
}
