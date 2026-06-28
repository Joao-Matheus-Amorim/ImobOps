// Register a purchase proposal against a listing. The repo also flips the
// listing to "sob_proposta". Without this route the proposal form was visual
// only and nothing persisted.
import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  listingId: z.string().min(1, "Selecione o anúncio."),
  buyerClientId: z.string().min(1, "Selecione o comprador."),
  brokerUserId: z.string().min(1, "Selecione o corretor."),
  offeredPrice: z.number().positive("Valor ofertado inválido."),
  conditions: z.string().trim().min(1).nullable().optional(),
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
  const d = parsed.data;

  const listing = await salesRepository.getListing(ctx, d.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Listagem não encontrada." }, { status: 400 });
  }
  const property = await propertiesRepository.get(ctx, listing.propertyId);
  if (!property?.ownerClientId) {
    return NextResponse.json({ error: "A listagem precisa estar ligada a um imóvel com proprietário." }, { status: 400 });
  }
  const buyer = await clientsRepository.get(ctx, d.buyerClientId);
  if (!buyer) {
    return NextResponse.json({ error: "Cliente comprador não encontrado." }, { status: 400 });
  }
  if (buyer.id === property.ownerClientId) {
    return NextResponse.json({ error: "Comprador e vendedor devem ser diferentes." }, { status: 400 });
  }

  const proposal = await salesRepository.registerProposal(ctx, {
    listingId: d.listingId,
    buyerClientId: d.buyerClientId,
    brokerUserId: d.brokerUserId,
    offeredPrice: d.offeredPrice,
    conditions: d.conditions ?? null,
    status: "em_analise",
    history: [
      {
        at: new Date().toISOString(),
        by: "buyer",
        price: d.offeredPrice,
        note: d.conditions ?? null,
      },
    ],
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "proposal",
    entityId: proposal.id,
    payloadBefore: null,
    payloadAfter: proposal as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, proposal });
}
