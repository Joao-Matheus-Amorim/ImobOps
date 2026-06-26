// Create a CRM lead manually (not just via WhatsApp triage). The funnel board
// posts here. Optionally links to a client and assigns a broker.
import { NextResponse } from "next/server";
import { z } from "zod";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  clientId: z.string().nullable().optional(),
  source: z.enum(["whatsapp", "site", "indicacao", "outros"]).default("outros"),
  interest: z.enum(["locacao", "venda", "condominio", "outro"]),
  assignedToUserId: z.string().nullable().optional(),
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

  const lead = await crmRepository.createLead(ctx, {
    clientId: d.clientId ?? null,
    source: d.source,
    interest: d.interest,
    assignedToUserId: d.assignedToUserId ?? null,
    funnelStage: "novo",
    lostReason: null,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "crm_lead",
    entityId: lead.id,
    payloadBefore: null,
    payloadAfter: lead as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, lead });
}
