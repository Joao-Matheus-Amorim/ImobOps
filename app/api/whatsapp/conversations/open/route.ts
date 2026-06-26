// Open (or create) a WhatsApp conversation for a phone number. Used by the
// "Abrir conversa no WhatsApp" button on the client detail, so the inbox can
// deep-link straight to it.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { requireContext } from "@/lib/api-auth";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { normalizeBrazilPhone } from "@/lib/utils";

const bodySchema = z.object({
  phone: z.string().trim().min(8, "Telefone inválido."),
  name: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const auth = await requireContext(request);
  if ("error" in auth) return auth.error;
  const { ctx } = auth;

  const principal = await getPrincipal();
  if (!principal || !can(principal, "whatsapp", "create")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Telefone inválido." },
      { status: 400 },
    );
  }

  // Conversations store the raw national number (e.g. 5521999990000).
  const phone = normalizeBrazilPhone(parsed.data.phone).replace(/\D/g, "");
  const conversation = await whatsappRepository.upsertConversation(
    ctx,
    phone,
    undefined,
    parsed.data.name,
  );

  return NextResponse.json({ ok: true, conversationId: conversation.id });
}
