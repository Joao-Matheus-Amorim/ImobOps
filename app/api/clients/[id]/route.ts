import { NextResponse } from "next/server";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { requireContext } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireContext();
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const removed = await clientsRepository.remove(ctx, params.id);
  if (!removed) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
