import Link from "next/link";
import { Download, FileText, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import type { DocumentRecord, DocumentStatus, EntityType } from "@/lib/types/domain";
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS } from "@/lib/types/domain";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<DocumentStatus, "default" | "success" | "warning" | "destructive"> = {
  pendente: "warning",
  validado: "success",
  rejeitado: "destructive",
  vencido: "destructive",
};

const ENTITY_LABELS: Record<EntityType, string> = {
  client: "Cliente",
  property: "Imóvel",
  rental_contract: "Locação",
  installment: "Parcela",
  sale_contract: "Venda",
  charge: "Cobrança",
  condo: "Condomínio",
  unit: "Unidade",
  condo_meeting: "Assembleia",
  lead: "Lead",
  whatsapp_conversation: "WhatsApp",
};

function entityHref(document: DocumentRecord): string | null {
  if (document.entityType === "client") return routes.client(document.entityId);
  if (document.entityType === "property") return routes.property(document.entityId);
  if (document.entityType === "rental_contract") return routes.rental(document.entityId);
  if (document.entityType === "sale_contract") return routes.sale(document.entityId);
  if (document.entityType === "condo") return routes.condo(document.entityId);
  if (document.entityType === "lead") return routes.crm;
  if (document.entityType === "charge") return routes.finance;
  if (document.entityType === "whatsapp_conversation") return routes.whatsapp;
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsOverview({ documents }: { documents: DocumentRecord[] }) {
  const pending = documents.filter((document) => document.status === "pendente").length;
  const rejected = documents.filter((document) => document.status === "rejeitado").length;
  const expired = documents.filter((document) => document.status === "vencido").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de documentos</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl font-bold">{documents.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl font-bold text-[hsl(var(--warning))]">{pending}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Com problema</CardTitle>
          </CardHeader>
          <CardContent className="font-display text-3xl font-bold text-destructive">{rejected + expired}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Arquivos enviados</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Uploads vinculados a clientes, imóveis, locações e demais entidades.</p>
          </div>
          <Badge variant="outline">{documents.length} arquivo(s)</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-background/25 p-5 text-sm text-muted-foreground">
              <ShieldAlert className="size-5 text-primary" />
              Nenhum documento cadastrado ainda. Envie arquivos nos painéis de Cliente, Imóvel ou Locação.
            </div>
          ) : (
            documents.map((document) => {
              const href = entityHref(document);
              return (
                <div key={document.id} className="flex flex-col gap-3 rounded-xl border border-primary/12 bg-background/25 p-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{document.title}</p>
                        <Badge variant={statusVariant[document.status]}>{DOCUMENT_STATUS_LABELS[document.status]}</Badge>
                        <Badge variant="outline">{DOCUMENT_KIND_LABELS[document.kind]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ENTITY_LABELS[document.entityType]} · {document.fileName} · {formatSize(document.size)} · enviado em {formatDate(document.createdAt)}
                        {document.expiresAt ? ` · vence ${formatDate(document.expiresAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {href ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={href}>Abrir origem</Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/documents/${document.id}/download`} target="_blank" rel="noreferrer">
                        <Download className="size-4" /> Baixar
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
