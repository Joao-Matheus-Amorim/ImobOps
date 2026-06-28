// Close a sale: create the sale contract and mark the listing as sold. Without
// this route, fechar a venda never persisted (only the listing did).
import { S } from "@/lib/status";
import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { financeRepository } from "@/lib/repositories/finance.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  listingId: z.string().min(1, "Selecione o anúncio."),
  buyerClientId: z.string().min(1, "Selecione o comprador."),
  sellerClientId: z.string().min(1).optional(),
  finalPrice: z.number().positive("Valor final inválido."),
  signedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  paymentTerms: z.string().trim().min(1).nullable().optional(),
  // When set, generate the broker's commission from the listing's pct.
  brokerUserId: z.string().nullable().optional(),
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
  if (listing.status === S.VENDIDA || listing.status === S.CANCELADA) {
    return NextResponse.json({ error: "Esta listagem não pode ser fechada." }, { status: 400 });
  }
  const property = await propertiesRepository.get(ctx, listing.propertyId);
  if (!property?.ownerClientId) {
    return NextResponse.json({ error: "A venda precisa estar ligada a um imóvel com proprietário." }, { status: 400 });
  }
  const buyer = await clientsRepository.get(ctx, d.buyerClientId);
  if (!buyer) {
    return NextResponse.json({ error: "Cliente comprador não encontrado." }, { status: 400 });
  }
  if (buyer.id === property.ownerClientId) {
    return NextResponse.json({ error: "Comprador e vendedor devem ser diferentes." }, { status: 400 });
  }
  if (d.sellerClientId && d.sellerClientId !== property.ownerClientId) {
    return NextResponse.json({ error: "O vendedor deve ser o proprietário vinculado ao imóvel." }, { status: 400 });
  }

  const contract = await salesRepository.closeSaleContract(ctx, {
    listingId: d.listingId,
    buyerClientId: d.buyerClientId,
    sellerClientId: property.ownerClientId,
    finalPrice: d.finalPrice,
    signedAt: d.signedAt ?? null,
    paymentTerms: d.paymentTerms ?? null,
    status: d.signedAt ? S.FECHADO : S.EM_ANDAMENTO,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "sale_contract",
    entityId: contract.id,
    payloadBefore: null,
    payloadAfter: contract as unknown as Record<string, unknown>,
  });

  // Auto-generate the broker's commission from the listing's commission %.
  let commission = null;
  if (d.brokerUserId) {
    const pct = listing?.commissionPct ?? 0;
    if (pct > 0) {
      commission = await financeRepository.createCommission(ctx, {
        saleContractId: contract.id,
        brokerUserId: d.brokerUserId,
        pct,
        amount: Math.round(d.finalPrice * pct) / 100,
        status: S.PENDENTE,
        paidAt: null,
      });
      await auditRepository.log(ctx, {
        userId: ctx.userId,
        action: "create",
        entityType: "commission",
        entityId: commission.id,
        payloadBefore: null,
        payloadAfter: commission as unknown as Record<string, unknown>,
      });
    }
  }

  await propertiesRepository.changeStatus(ctx, property.id, "vendido");

  return NextResponse.json({ ok: true, contract, commission });
}
