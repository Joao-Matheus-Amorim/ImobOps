// Create a client. Body matches the Client domain shape minus base/audit fields.
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { requireContext } from "@/lib/api-auth";

const bodySchema = z.object({
  kind: z.enum(["pf", "pj"]),
  name: z.string().min(1, "Informe o nome."),
  document: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  whatsapp: z.string().trim().min(1).nullable().optional(),
  address: z.string().trim().min(1).nullable().optional(),
  tags: z.array(z.string()).default([]),
  rolesInBusiness: z
    .array(
      z.enum([
        "locador",
        "locatario",
        "fiador",
        "comprador",
        "vendedor",
        "lead",
        "proprietario_condomino",
      ]),
    )
    .default([]),
  ownerUserId: z.string().nullable().optional(),
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

  const client = await clientsRepository.create(ctx, {
    kind: parsed.data.kind,
    name: parsed.data.name,
    document: parsed.data.document ?? null,
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null,
    whatsapp: parsed.data.whatsapp ?? null,
    address: parsed.data.address ?? null,
    tags: parsed.data.tags,
    rolesInBusiness: parsed.data.rolesInBusiness,
    ownerUserId: parsed.data.ownerUserId ?? ctx.userId,
  });

  return NextResponse.json({ ok: true, client });
}
