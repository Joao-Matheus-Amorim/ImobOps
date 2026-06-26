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

// Editable fields. All optional so the client can send a partial patch.
const patchSchema = z.object({
  kind: z.enum(["pf", "pj"]).optional(),
  name: z.string().min(1).optional(),
  document: z.string().trim().min(1).nullable().optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  whatsapp: z.string().trim().min(1).nullable().optional(),
  address: z.string().trim().min(1).nullable().optional(),
  tags: z.array(z.string()).optional(),
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
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
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

  const before = await clientsRepository.get(ctx, params.id);
  if (!before) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  const effectiveKind = parsed.data.kind ?? before.kind;
  if (parsed.data.document && !isValidCpfCnpjLength(parsed.data.document, effectiveKind)) {
    return NextResponse.json(
      { error: effectiveKind === "pf" ? "CPF invalido." : "CNPJ invalido." },
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

  const client = await clientsRepository.update(ctx, params.id, {
    ...parsed.data,
    document:
      parsed.data.document != null
        ? normalizeCpfCnpj(parsed.data.document, effectiveKind)
        : parsed.data.document,
    phone:
      parsed.data.phone != null
        ? normalizeBrazilPhone(parsed.data.phone)
        : parsed.data.phone,
    whatsapp:
      parsed.data.whatsapp != null
        ? normalizeBrazilPhone(parsed.data.whatsapp)
        : parsed.data.whatsapp,
  });
  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "client",
    entityId: params.id,
    payloadBefore: before as unknown as Record<string, unknown>,
    payloadAfter: client as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, client });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireContext(request);
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
