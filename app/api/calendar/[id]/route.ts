// Delete a manual calendar event. Operational events (visits/charges/etc.) are
// aggregated and not deletable here.
import { NextResponse } from "next/server";
import { requireContext } from "@/lib/api-auth";
import { calendarRepository } from "@/lib/repositories/calendar.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const ok = await calendarRepository.remove(ctx, params.id);
  if (!ok) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "delete",
    entityType: "calendar_event",
    entityId: params.id,
    payloadBefore: null,
    payloadAfter: null,
  });

  return NextResponse.json({ ok: true });
}
