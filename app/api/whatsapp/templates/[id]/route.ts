// Edit / delete a WhatsApp quick-reply template. Admin-only.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { requireContext } from "@/lib/api-auth";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";

const patchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  body: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const principal = await getPrincipal();
  if (!principal || !can(principal, "admin", "edit")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const template = await whatsappRepository.updateTemplate(ctx, params.id, parsed.data);
  if (!template) {
    return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "update",
    entityType: "whatsapp_template",
    entityId: template.id,
    payloadBefore: null,
    payloadAfter: template as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, template });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const principal = await getPrincipal();
  if (!principal || !can(principal, "admin", "delete")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const ok = await whatsappRepository.deleteTemplate(ctx, params.id);
  if (!ok) {
    return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "delete",
    entityType: "whatsapp_template",
    entityId: params.id,
    payloadBefore: null,
    payloadAfter: null,
  });

  return NextResponse.json({ ok: true });
}
