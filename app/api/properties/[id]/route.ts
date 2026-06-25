import { NextResponse } from "next/server";
import { z } from "zod";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const patchSchema = z.object({
  kind: z.enum(["apartamento", "casa", "comercial", "terreno", "sala"]).optional(),
  address: z.string().min(1).optional(),
  areaM2: z.number().positive().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  parkingSpots: z.number().int().nonnegative().nullable().optional(),
  ownerClientId: z.string().nullable().optional(),
  status: z.enum(["disponivel", "alugado", "vendido", "em_obra", "inativo"]).optional(),
  availability: z.enum(["locacao", "venda", "ambos", "condominio_only"]).optional(),
  condoId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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

  const before = await propertiesRepository.get(ctx, params.id);
  if (!before) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  const property = await propertiesRepository.update(ctx, params.id, parsed.data);
  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "property",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: property as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, property });
}
