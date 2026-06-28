import { S } from "@/lib/status";
import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const patchSchema = z.object({
  askingPrice: z.number().positive().optional(),
  commissionPct: z.number().min(0).max(100).optional(),
  status: z.enum([S.ATIVA, S.SOB_PROPOSTA, S.VENDIDA, S.CANCELADA]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireContext(request);
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

  const before = await salesRepository.getListing(ctx, params.id);
  if (!before) {
    return NextResponse.json({ error: "Listagem não encontrada." }, { status: 404 });
  }

  const listing = await salesRepository.updateListing(ctx, params.id, parsed.data);
  if (!listing) {
    return NextResponse.json({ error: "Listagem não encontrada." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "sale_listing",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: listing as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, listing });
}
