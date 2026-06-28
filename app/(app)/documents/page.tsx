import { PageHeader } from "@/components/ui/page-header";
import { DocumentsOverview } from "@/components/domain/documents/documents-overview";
import { guardPage } from "@/lib/guard-page";
import { documentsRepository } from "@/lib/repositories/documents.repository";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const { ctx } = await guardPage("documents");
  const documents = await documentsRepository.list(ctx);

  return (
    <div className="space-y-5">
      <PageHeader
        badge="Documentos"
        title="Central de documentos"
        description="Acompanhe contratos, comprovantes, laudos e arquivos armazenados por entidade no Supabase Storage privado."
      />
      <DocumentsOverview documents={documents} />
    </div>
  );
}
