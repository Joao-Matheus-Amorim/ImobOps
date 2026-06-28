// Create a client. Body matches the Client domain shape minus base/audit fields.
import { NextResponse } from "next/server";
import { z } from "zod";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { requireContext } from "@/lib/api-auth";
import {
  isValidBrazilPhoneLength,
  isValidCpfCnpjLength,
  normalizeBrazilPhone,
  normalizeCpfCnpj,
} from "@/lib/utils";

const bodySchema = z.object({
  kind: z.enum(["pf", "pj"]),
  name: z.string().trim().refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome."),
  document: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().min(1, "Informe o telefone."),
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

  if (parsed.data.document && !isValidCpfCnpjLength(parsed.data.document, parsed.data.kind)) {
    return NextResponse.json(
      { error: parsed.data.kind === "pf" ? "CPF invalido." : "CNPJ invalido." },
      { status: 400 },
    );
  }
  if (parsed.data.phone && !isValidBrazilPhoneLength(parsed.data.phone)) {
    return NextResponse.json(
      { error: "Telefone invalido. Use um numero brasileiro com DDD." },
      { status: 400 },
    );
  }
  if (parsed.data.whatsapp && !isValidBrazilPhoneLength(parsed.data.whatsapp)) {
    return NextResponse.json(
      { error: "WhatsApp invalido. Use um numero brasileiro com DDD." },
      { status: 400 },
    );
  }

  const document = parsed.data.document
    ? normalizeCpfCnpj(parsed.data.document, parsed.data.kind)
    : null;
  const phone = parsed.data.phone ? normalizeBrazilPhone(parsed.data.phone) : null;
  const whatsapp = parsed.data.whatsapp ? normalizeBrazilPhone(parsed.data.whatsapp) : null;

  // Reject duplicates: same CPF/CNPJ, same phone/whatsapp, or same name+phone.
  const duplicate = await clientsRepository.findDuplicate(ctx, {
    name: parsed.data.name,
    document,
    phone,
    whatsapp,
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `Já existe um cliente com estes dados: ${duplicate.name}.`, duplicateId: duplicate.id },
      { status: 409 },
    );
  }

  const client = await clientsRepository.create(ctx, {
    kind: parsed.data.kind,
    name: parsed.data.name,
    document,
    email: parsed.data.email ?? null,
    phone,
    whatsapp,
    address: parsed.data.address ?? null,
    tags: parsed.data.tags,
    rolesInBusiness: parsed.data.rolesInBusiness,
    ownerUserId: parsed.data.ownerUserId ?? ctx.userId,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "client",
    entityId: client.id,
    payloadBefore: null,
    payloadAfter: client as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, client });
}
