// Create a rental contract and generate its installments. The form on the
// rentals page posts here; without it, contracts (and their recurring rent
// installments) never persisted.
import { NextResponse } from "next/server";
import { z } from "zod";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";
import {
  DEFAULT_LATE_FEE_PCT,
  DEFAULT_LATE_INTEREST_PCT_MONTH,
} from "@/lib/types/domain";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use yyyy-mm-dd");

const bodySchema = z.object({
  propertyId: z.string().min(1, "Selecione o imóvel."),
  landlordClientId: z.string().min(1, "Selecione o locador."),
  tenantClientId: z.string().min(1, "Selecione o locatário."),
  guarantorClientId: z.string().nullable().optional(),
  monthlyValue: z.number().positive("Valor mensal inválido."),
  dueDay: z.number().int().min(1).max(28),
  startDate: ymd,
  durationMonths: z.number().int().min(1).max(120),
  indexType: z.enum(["igpm", "ipca", "none"]).default("igpm"),
  adminFeePct: z.number().min(0).max(100).default(10),
  lateFeePct: z.number().min(0).max(100).default(DEFAULT_LATE_FEE_PCT),
  lateInterestPctMonth: z.number().min(0).max(100).default(DEFAULT_LATE_INTEREST_PCT_MONTH),
});

// Add N months to a yyyy-mm-dd date, returning yyyy-mm-dd.
function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

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

  const contract = await rentalsRepository.create(ctx, {
    propertyId: d.propertyId,
    landlordClientId: d.landlordClientId,
    tenantClientId: d.tenantClientId,
    guarantorClientId: d.guarantorClientId ?? null,
    monthlyValue: d.monthlyValue,
    dueDay: d.dueDay,
    startDate: d.startDate,
    endDate: addMonths(d.startDate, d.durationMonths),
    durationMonths: d.durationMonths,
    indexType: d.indexType,
    adminFeePct: d.adminFeePct,
    lateFeePct: d.lateFeePct,
    lateInterestPctMonth: d.lateInterestPctMonth,
    status: "ativo",
  });

  // Generate the recurring rent installments for the contract.
  const installments = await rentalsRepository.generateInstallments(ctx, contract.id);

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "rental_contract",
    entityId: contract.id,
    payloadBefore: null,
    payloadAfter: contract as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, contract, installments: installments.length });
}
