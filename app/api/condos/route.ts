// Create a condo. Body matches the Condo domain shape minus base/audit fields.
import { NextResponse } from "next/server";
import { z } from "zod";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  address: z.string().min(1, "Informe o endereço."),
  unitCount: z.number().int().positive(),
  adminFeePct: z.number().min(0).max(100),
  managerUserId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await requireContext();
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

  const condo = await condosRepository.create(ctx, {
    name: parsed.data.name,
    address: parsed.data.address,
    unitCount: parsed.data.unitCount,
    adminFeePct: parsed.data.adminFeePct,
    managerUserId: parsed.data.managerUserId ?? null,
  });

  return NextResponse.json({ ok: true, condo });
}
