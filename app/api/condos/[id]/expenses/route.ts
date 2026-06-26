// Register a condo expense (lançamento de despesa do condomínio).
import { NextResponse } from "next/server";
import { z } from "zod";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, "use yyyy-mm"),
  description: z.string().trim().min(1, "Informe a descrição."),
  totalAmount: z.number().positive("Valor inválido."),
  apportionment: z.enum(["igual", "fracao_ideal"]).default("igual"),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const condo = await condosRepository.get(ctx, params.id);
  if (!condo) {
    return NextResponse.json({ error: "Condomínio não encontrado." }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const expense = await condosRepository.registerExpense(ctx, {
    condoId: params.id,
    referenceMonth: d.referenceMonth,
    description: d.description,
    totalAmount: d.totalAmount,
    apportionment: d.apportionment,
    status: "lancada",
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "condo_expense",
    entityId: expense.id,
    payloadBefore: null,
    payloadAfter: expense as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, expense });
}
