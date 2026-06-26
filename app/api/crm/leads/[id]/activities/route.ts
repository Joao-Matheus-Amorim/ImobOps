// Log a CRM activity for a lead (call, visit, note, etc.).
import { NextResponse } from "next/server";
import { z } from "zod";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  kind: z.enum(["ligacao", "visita", "whatsapp", "email", "proposta", "nota"]),
  description: z.string().trim().min(1).nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const lead = await crmRepository.getLead(ctx, params.id);
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
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

  const activity = await crmRepository.logActivity(ctx, {
    leadId: params.id,
    kind: d.kind,
    description: d.description ?? null,
    scheduledAt: d.scheduledAt ?? null,
    doneAt: d.scheduledAt ? null : new Date().toISOString(),
    byUserId: ctx.userId,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "crm_activity",
    entityId: activity.id,
    payloadBefore: null,
    payloadAfter: activity as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, activity });
}
