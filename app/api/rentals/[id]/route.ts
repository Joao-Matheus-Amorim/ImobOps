import { NextResponse } from "next/server";
import { z } from "zod";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

// Contract metadata only. Changing monthlyValue here does not retroactively
// rewrite already-generated installments — that is a separate, deliberate action.
const patchSchema = z.object({
  monthlyValue: z.number().positive().optional(),
  dueDay: z.number().int().min(1).max(28).optional(),
  adminFeePct: z.number().min(0).max(100).optional(),
  lateFeePct: z.number().min(0).max(100).optional(),
  lateInterestPctMonth: z.number().min(0).max(100).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use yyyy-mm-dd").optional(),
  indexType: z.enum(["igpm", "ipca", "none"]).optional(),
  status: z.enum(["ativo", "encerrado", "inadimplente", "em_renovacao"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const before = await rentalsRepository.get(ctx, params.id);
  if (!before) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  const contract = await rentalsRepository.update(ctx, params.id, parsed.data);
  if (!contract) {
    return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "rental_contract",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: contract as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, contract });
}
