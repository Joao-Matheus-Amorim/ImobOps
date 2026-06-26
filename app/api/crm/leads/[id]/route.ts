// Update a CRM lead: move funnel stage and/or (re)assign a broker. Used by the
// funnel board's stage control.
import { NextResponse } from "next/server";
import { z } from "zod";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const patchSchema = z
  .object({
    funnelStage: z
      .enum([
        "novo",
        "qualificado",
        "visita_agendada",
        "proposta",
        "fechado_ganho",
        "fechado_perdido",
      ])
      .optional(),
    lostReason: z.string().trim().min(1).nullable().optional(),
    assignedToUserId: z.string().nullable().optional(),
  })
  .refine((d) => d.funnelStage !== undefined || d.assignedToUserId !== undefined, {
    message: "Informe funnelStage ou assignedToUserId.",
  });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

  const before = await crmRepository.getLead(ctx, params.id);
  if (!before) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  let lead = before;
  if (parsed.data.funnelStage) {
    lead =
      (await crmRepository.moveStage(
        ctx,
        params.id,
        parsed.data.funnelStage,
        parsed.data.lostReason ?? undefined,
      )) ?? lead;
  }
  if (parsed.data.assignedToUserId !== undefined && parsed.data.assignedToUserId !== null) {
    lead = (await crmRepository.assignLead(ctx, params.id, parsed.data.assignedToUserId)) ?? lead;
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "crm_lead",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: lead as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, lead });
}
