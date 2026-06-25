// Create a sale listing for an existing property. Body: { propertyId,
// askingPrice, commissionPct }.
import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  propertyId: z.string().min(1, "Selecione o imóvel."),
  askingPrice: z.number().positive("Informe o valor pedido."),
  commissionPct: z.number().min(0).max(100),
});

export async function POST(request: Request) {
  const auth = await requireContext(request);
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

  const listing = await salesRepository.createListing(ctx, {
    propertyId: parsed.data.propertyId,
    askingPrice: parsed.data.askingPrice,
    status: "ativa",
    commissionPct: parsed.data.commissionPct,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "sale_listing",
    entityId: listing.id,
    payloadBefore: null,
    payloadAfter: listing as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, listing });
}
