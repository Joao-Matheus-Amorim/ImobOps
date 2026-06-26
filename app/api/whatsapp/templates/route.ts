// WhatsApp quick-reply templates. GET for any user with whatsapp access (used by
// the inbox); POST is admin-only (manage the catalog).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { requireContext } from "@/lib/api-auth";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";

export async function GET(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const principal = await getPrincipal();
  if (!principal || !can(principal, "whatsapp", "view")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const url = new URL(request.url);
  const onlyActive = url.searchParams.get("active") === "1";
  const templates = await whatsappRepository.listTemplates(ctx, onlyActive);
  return NextResponse.json({ templates });
}

const bodySchema = z.object({
  title: z.string().trim().min(1, "Informe um título."),
  body: z.string().trim().min(1, "Informe o texto."),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const principal = await getPrincipal();
  if (!principal || !can(principal, "admin", "create")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const template = await whatsappRepository.createTemplate(ctx, {
    title: parsed.data.title,
    body: parsed.data.body,
    active: parsed.data.active,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "whatsapp_template",
    entityId: template.id,
    payloadBefore: null,
    payloadAfter: template as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, template });
}
