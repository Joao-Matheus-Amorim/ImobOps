import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { can } from "@/lib/permissions/enforce";
import { isSupabaseConfigured } from "@/lib/constants";
import { documentsRepository } from "@/lib/repositories/documents.repository";
import type { DocumentKind, EntityType } from "@/lib/types/domain";
import { ensureDocumentBucket, getDocumentStorageClient } from "@/lib/documents/storage";
import {
  ALLOWED_DOCUMENT_MIME,
  DOCUMENT_BUCKET,
  DOCUMENT_KINDS,
  ENTITY_FEATURE,
  MAX_DOCUMENT_BYTES_BY_MIME,
  documentStoragePath,
  sanitizeFileName,
} from "@/lib/documents/config";

const querySchema = z.object({
  entityType: z.string(),
  entityId: z.string().min(1),
});

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(request: Request) {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const rawEntityType = url.searchParams.get("entityType");
  const rawEntityId = url.searchParams.get("entityId");

  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  if (!rawEntityType && !rawEntityId) {
    if (!can(principal, "documents", "view")) {
      return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
    }
    const allDocuments = await documentsRepository.list(ctx);
    const documents = allDocuments.filter((document) => {
      const feature = ENTITY_FEATURE[document.entityType];
      return feature ? can(principal, feature, "view") : false;
    });
    return NextResponse.json({ documents });
  }

  const parsed = querySchema.safeParse({
    entityType: rawEntityType,
    entityId: rawEntityId,
  });
  if (!parsed.success) return badRequest("Informe entityType e entityId juntos.");

  const entityType = parsed.data.entityType as EntityType;
  const feature = ENTITY_FEATURE[entityType];
  if (!feature) return badRequest("Tipo de entidade inválido.");
  if (!can(principal, feature, "view")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const documents = await documentsRepository.listForEntity(ctx, entityType, parsed.data.entityId);
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return badRequest("Envie multipart/form-data.");

  const file = form.get("file");
  const entityType = String(form.get("entityType") ?? "") as EntityType;
  const entityId = String(form.get("entityId") ?? "");
  const kind = String(form.get("kind") ?? "outro") as DocumentKind;
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const expiresAt = String(form.get("expiresAt") ?? "").trim() || null;

  if (!(file instanceof File)) return badRequest("Arquivo obrigatório.");
  const feature = ENTITY_FEATURE[entityType];
  if (!feature) return badRequest("Tipo de entidade inválido.");
  if (!DOCUMENT_KINDS.includes(kind)) return badRequest("Tipo de documento inválido.");
  if (!can(principal, feature, "edit") && !can(principal, feature, "create")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }
  if (!ALLOWED_DOCUMENT_MIME.has(file.type)) {
    return badRequest("Tipo de arquivo inválido. Use PDF, JPG, PNG ou DOCX.");
  }
  const maxBytes = MAX_DOCUMENT_BYTES_BY_MIME[file.type] ?? 0;
  if (file.size <= 0 || file.size > maxBytes) {
    return badRequest(`Arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    return badRequest("Data de validade deve estar em yyyy-mm-dd.");
  }

  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  const documentId = randomUUID();
  const fileName = sanitizeFileName(file.name);
  const storagePath = isSupabaseConfigured()
    ? documentStoragePath({ tenancyId: user.tenancyId, entityType, entityId, documentId, fileName })
    : `mock://${user.tenancyId}/${entityType}/${entityId}/${documentId}/${fileName}`;

  if (isSupabaseConfigured()) {
    const bucketError = await ensureDocumentBucket();
    if (bucketError) return NextResponse.json({ error: `Falha ao preparar bucket: ${bucketError}` }, { status: 502 });
    const supabase = getDocumentStorageClient();
    if (!supabase) return NextResponse.json({ error: "Storage indisponível." }, { status: 503 });
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return NextResponse.json({ error: `Falha no upload: ${error.message}` }, { status: 502 });
  }

  const document = await documentsRepository.create(ctx, {
    id: documentId,
    entityType,
    entityId,
    kind,
    title: title || fileName,
    description,
    fileName,
    storagePath,
    mime: file.type,
    size: file.size,
    status: "pendente",
    expiresAt,
    uploadedBy: user.id,
    validatedBy: null,
    validatedAt: null,
    rejectedReason: null,
  });

  return NextResponse.json({ document }, { status: 201 });
}
