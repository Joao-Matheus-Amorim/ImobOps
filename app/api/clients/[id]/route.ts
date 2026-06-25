import { NextResponse } from "next/server";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  // Capture the row before deleting so the audit trail keeps what was removed.
  const before = await clientsRepository.get(ctx, params.id);
  const removed = await clientsRepository.remove(ctx, params.id);
  if (!removed) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "delete",
    entityType: "client",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown> | null,
    payloadAfter: null,
  });

  return NextResponse.json({ ok: true });
}
