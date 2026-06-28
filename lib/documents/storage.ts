import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOCUMENT_BUCKET } from "./config";

export function getDocumentStorageClient() {
  return createAdminClient() ?? createClient();
}

export async function ensureDocumentBucket(): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.storage.getBucket(DOCUMENT_BUCKET);
  if (data) return null;

  const { error } = await admin.storage.createBucket(DOCUMENT_BUCKET, {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  });

  return error?.message ?? null;
}
