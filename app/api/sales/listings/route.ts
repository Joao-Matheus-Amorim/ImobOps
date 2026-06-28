// Create a sale listing for an existing property. Body: { propertyId,
// askingPrice, commissionPct }.
import { S } from "@/lib/status";
import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
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

  const property = await propertiesRepository.get(ctx, parsed.data.propertyId);
  if (!property) {
    return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 400 });
  }
  if (!property.ownerClientId) {
    return NextResponse.json({ error: "O imóvel precisa ter um cliente proprietário antes da venda." }, { status: 400 });
  }
  if (property.availability !== "venda" && property.availability !== "ambos") {
    return NextResponse.json({ error: "O imóvel não está disponível para venda." }, { status: 400 });
  }
  if (property.status === "vendido" || property.status === "inativo") {
    return NextResponse.json({ error: "Imóvel vendido ou inativo não pode receber nova listagem." }, { status: 400 });
  }
  const existingListings = await salesRepository.listListings(ctx);
  const hasOpenListing = existingListings.some(
    (listing) =>
      listing.propertyId === property.id &&
      (listing.status === S.ATIVA || listing.status === S.SOB_PROPOSTA),
  );
  if (hasOpenListing) {
    return NextResponse.json({ error: "Este imóvel já possui uma listagem de venda ativa." }, { status: 400 });
  }

  const listing = await salesRepository.createListing(ctx, {
    propertyId: parsed.data.propertyId,
    askingPrice: parsed.data.askingPrice,
    status: S.ATIVA,
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
