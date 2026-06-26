// Close a sale: create the sale contract and mark the listing as sold. Without
// this route, fechar a venda never persisted (only the listing did).
import { NextResponse } from "next/server";
import { z } from "zod";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  listingId: z.string().min(1, "Selecione o anúncio."),
  buyerClientId: z.string().min(1, "Selecione o comprador."),
  sellerClientId: z.string().min(1, "Selecione o vendedor."),
  finalPrice: z.number().positive("Valor final inválido."),
  signedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  paymentTerms: z.string().trim().min(1).nullable().optional(),
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

  const contract = await salesRepository.closeSaleContract(ctx, {
    listingId: d.listingId,
    buyerClientId: d.buyerClientId,
    sellerClientId: d.sellerClientId,
    finalPrice: d.finalPrice,
    signedAt: d.signedAt ?? null,
    paymentTerms: d.paymentTerms ?? null,
    status: d.signedAt ? "fechado" : "em_andamento",
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "sale_contract",
    entityId: contract.id,
    payloadBefore: null,
    payloadAfter: contract as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, contract });
}
