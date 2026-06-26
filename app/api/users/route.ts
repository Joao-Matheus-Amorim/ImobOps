// Create a team member (profile only — no auth account yet). Admin-only.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { requireContext } from "@/lib/api-auth";
import { usersRepository } from "@/lib/repositories/users.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { isValidBrazilPhoneLength, normalizeBrazilPhone } from "@/lib/utils";

const bodySchema = z.object({
  displayName: z.string().trim().min(1, "Informe o nome."),
  email: z.string().trim().email("E-mail inválido."),
  role: z.enum(["admin", "manager", "broker", "finance", "condo_admin", "viewer"]),
  phone: z.string().trim().min(1).nullable().optional(),
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
  if (parsed.data.phone && !isValidBrazilPhoneLength(parsed.data.phone)) {
    return NextResponse.json(
      { error: "Telefone inválido. Use um número brasileiro com DDD." },
      { status: 400 },
    );
  }

  const user = await usersRepository.create(ctx, {
    authUserId: null,
    role: parsed.data.role,
    displayName: parsed.data.displayName,
    avatarUrl: null,
    phone: parsed.data.phone ? normalizeBrazilPhone(parsed.data.phone) : null,
    email: parsed.data.email,
    active: parsed.data.active,
  });

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "user",
    entityId: user.id,
    payloadBefore: null,
    payloadAfter: user as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, user });
}
