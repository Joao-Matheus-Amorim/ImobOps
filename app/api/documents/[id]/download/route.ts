import { NextResponse } from "next/server";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { isSupabaseConfigured } from "@/lib/constants";
import { documentsRepository } from "@/lib/repositories/documents.repository";
import { DOCUMENT_BUCKET, ENTITY_FEATURE } from "@/lib/documents/config";
import { getDocumentStorageClient } from "@/lib/documents/storage";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  const document = await documentsRepository.get(ctx, params.id);
  if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  const feature = ENTITY_FEATURE[document.entityType];
  if (!feature || !can(principal, feature, "view")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  if (!isSupabaseConfigured()) {
    return new Response(`Arquivo mock: ${document.fileName}`, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${document.fileName}"`,
      },
    });
  }

  const supabase = getDocumentStorageClient();
  if (!supabase) return NextResponse.json({ error: "Storage indisponível." }, { status: 503 });
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storagePath, 60, { download: document.fileName });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: `Falha ao gerar link: ${error?.message ?? "sem URL"}` }, { status: 502 });
  }
  return NextResponse.redirect(data.signedUrl);
}
