import { S } from "@/lib/status";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { isSupabaseConfigured } from "@/lib/constants";
import { documentsRepository } from "@/lib/repositories/documents.repository";
import { DOCUMENT_BUCKET, ENTITY_FEATURE } from "@/lib/documents/config";
import { getDocumentStorageClient } from "@/lib/documents/storage";

const patchSchema = z.object({
  status: z.enum([S.PENDENTE, S.VALIDADO, S.REJEITADO, S.VENCIDO]),
  rejectedReason: z.string().max(500).optional().nullable(),
});

async function loadAuthorized(id: string, action: "view" | "edit" | "delete") {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  const document = await documentsRepository.get(ctx, id);
  if (!document) return { error: NextResponse.json({ error: "Documento não encontrado." }, { status: 404 }) };
  const feature = ENTITY_FEATURE[document.entityType];
  if (!feature || !can(principal, feature, action)) {
    return { error: NextResponse.json({ error: "Permissão negada." }, { status: 403 }) };
  }
  return { principal, user, ctx, document };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const loaded = await loadAuthorized(params.id, "edit");
  if (loaded.error) return loaded.error;
  const { principal, user, ctx } = loaded;
  if (principal.role !== "admin" && principal.role !== "manager") {
    return NextResponse.json({ error: "Somente admin/manager validam documentos." }, { status: 403 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const validated = parsed.data.status === S.VALIDADO;
  const rejected = parsed.data.status === S.REJEITADO;
  const document = await documentsRepository.updateStatus(ctx, params.id, {
    status: parsed.data.status,
    validatedBy: validated ? user.id : null,
    validatedAt: validated ? new Date().toISOString() : null,
    rejectedReason: rejected ? parsed.data.rejectedReason ?? "Rejeitado manualmente." : null,
  });
  return NextResponse.json({ document });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const loaded = await loadAuthorized(params.id, "delete");
  if (loaded.error) return loaded.error;
  const { ctx, document } = loaded;

  if (isSupabaseConfigured()) {
    const supabase = getDocumentStorageClient();
    if (!supabase) return NextResponse.json({ error: "Storage indisponível." }, { status: 503 });
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove([document.storagePath]);
    if (error) return NextResponse.json({ error: `Falha ao apagar arquivo: ${error.message}` }, { status: 502 });
  }

  const ok = await documentsRepository.remove(ctx, document.id);
  return NextResponse.json({ ok });
}
