// Create a team member. Admin-only. Invites the email into Supabase Auth so the
// person can set a password and log in; their role drives feature access via
// DEFAULT_PERMISSIONS + the access-token hook. Falls back to a profile-only
// record when the admin auth client isn't configured (mock/no service key).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { requireContext } from "@/lib/api-auth";
import { usersRepository } from "@/lib/repositories/users.repository";
import { auditRepository } from "@/lib/repositories/audit.repository";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const email = parsed.data.email.toLowerCase();

  // Invite the email into Supabase Auth so they can set a password and log in.
  // The role+tenancy are stashed in user_metadata for traceability; access is
  // driven by the profile's role via DEFAULT_PERMISSIONS + the access-token hook.
  let authUserId: string | null = null;
  let invited = false;
  const admin = createAdminClient();
  if (admin) {
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      : undefined;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { display_name: parsed.data.displayName, role: parsed.data.role, tenancy_id: ctx.tenancyId },
      redirectTo,
    });
    if (error) {
      const already = /already|registered|exists/i.test(error.message);
      return NextResponse.json(
        {
          error: already
            ? "Já existe um usuário com este e-mail."
            : `Falha ao convidar: ${error.message}`,
        },
        { status: already ? 409 : 502 },
      );
    }
    authUserId = data.user?.id ?? null;
    invited = true;
  }

  let user;
  try {
    user = await usersRepository.create(ctx, {
      authUserId,
      role: parsed.data.role,
      displayName: parsed.data.displayName,
      avatarUrl: null,
      phone: parsed.data.phone ? normalizeBrazilPhone(parsed.data.phone) : null,
      email,
      active: parsed.data.active,
    });
  } catch (err) {
    // Roll back the auth invite so we don't leave an orphan account.
    if (admin && authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    return NextResponse.json(
      { error: `Falha ao criar o perfil: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  await auditRepository.log(ctx, {
    userId: ctx.userId,
    action: "create",
    entityType: "user",
    entityId: user.id,
    payloadBefore: null,
    payloadAfter: user as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ok: true, user, invited });
}
