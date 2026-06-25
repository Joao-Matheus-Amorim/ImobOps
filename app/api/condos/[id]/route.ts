import { NextResponse } from "next/server";
import { z } from "zod";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  unitCount: z.number().int().positive().optional(),
  adminFeePct: z.number().min(0).max(100).optional(),
  managerUserId: z.string().nullable().optional(),
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

  const before = await condosRepository.get(ctx, params.id);
  if (!before) {
    return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
  }

  const condo = await condosRepository.update(ctx, params.id, parsed.data);
  if (!condo) {
    return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "condo",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: condo as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, condo });
}
