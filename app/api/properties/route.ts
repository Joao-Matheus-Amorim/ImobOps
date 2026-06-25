// Create a property. Body matches the Property domain shape minus base/audit fields.
import { NextResponse } from "next/server";
import { z } from "zod";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  kind: z.enum(["apartamento", "casa", "comercial", "terreno", "sala"]),
  address: z.string().min(1, "Informe o endereço."),
  areaM2: z.number().positive().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().int().nonnegative().nullable().optional(),
  parkingSpots: z.number().int().nonnegative().nullable().optional(),
  ownerClientId: z.string().nullable().optional(),
  status: z
    .enum(["disponivel", "alugado", "vendido", "em_obra", "inativo"])
    .default("disponivel"),
  availability: z
    .enum(["locacao", "venda", "ambos", "condominio_only"])
    .default("locacao"),
  condoId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const property = await propertiesRepository.create(ctx, {
    kind: parsed.data.kind,
    address: parsed.data.address,
    areaM2: parsed.data.areaM2 ?? null,
    bedrooms: parsed.data.bedrooms ?? null,
    bathrooms: parsed.data.bathrooms ?? null,
    parkingSpots: parsed.data.parkingSpots ?? null,
    ownerClientId: parsed.data.ownerClientId ?? null,
    status: parsed.data.status,
    availability: parsed.data.availability,
    condoId: parsed.data.condoId ?? null,
    photos: [],
    description: parsed.data.description ?? null,
    ownerUserId: ctx.userId,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "property",
    entityId: property.id,
    payloadBefore: null,
    payloadAfter: property as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, property });
}
