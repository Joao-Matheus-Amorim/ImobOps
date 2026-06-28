"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, Download, FileText, ShieldCheck, Trash2, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentKind, DocumentRecord, DocumentStatus, EntityType } from "@/lib/types/domain";
import type { Role } from "@/lib/types/permissions";
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS } from "@/lib/types/domain";
import { DOCUMENT_KINDS, MAX_DOCUMENT_BYTES_BY_MIME } from "@/lib/documents/config";
import { formatDate } from "@/lib/utils";

const statusVariant: Record<DocumentStatus, "default" | "success" | "warning" | "destructive"> = {
  pendente: "warning",
  validado: "success",
  rejeitado: "destructive",
  vencido: "destructive",
};

const maxLabel = Object.values(MAX_DOCUMENT_BYTES_BY_MIME).reduce((max, value) => Math.max(max, value), 0) / 1024 / 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentPanel({
  entityType,
  entityId,
  title = "Documentos",
  userRole,
}: {
  entityType: EntityType;
  entityId: string;
  title?: string;
  userRole: Role;
}) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<DocumentKind>("outro");
  const [docTitle, setDocTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const canValidate = userRole === "admin" || userRole === "manager";

  const query = useMemo(() => {
    const params = new URLSearchParams({ entityType, entityId });
    return `/api/documents?${params.toString()}`;
  }, [entityId, entityType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(query, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error ?? "Falha ao carregar documentos.");
    else setDocuments(body.documents ?? []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    startTransition(async () => {
      setError(null);
      const form = new FormData();
      form.set("file", file);
      form.set("entityType", entityType);
      form.set("entityId", entityId);
      form.set("kind", kind);
      form.set("title", docTitle.trim() || file.name);
      if (expiresAt) form.set("expiresAt", expiresAt);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Falha no upload.");
        return;
      }
      setDocTitle("");
      setExpiresAt("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    });
  }

  function patchStatus(id: string, status: DocumentStatus) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? "Falha ao atualizar documento.");
      else await load();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Apagar este documento e o arquivo do storage?")) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? "Falha ao apagar documento.");
      else await load();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF até 25 MB, DOCX até 15 MB, JPG/PNG até 10 MB.
          </p>
        </div>
        <Badge variant="outline">{documents.length} arquivo(s)</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-primary/12 bg-background/25 p-3 md:grid-cols-[1fr_160px_160px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`file-${entityType}-${entityId}`}>Arquivo</Label>
            <Input id={`file-${entityType}-${entityId}`} ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`kind-${entityType}-${entityId}`}>Tipo</Label>
            <select
              id={`kind-${entityType}-${entityId}`}
              value={kind}
              onChange={(event) => setKind(event.target.value as DocumentKind)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {DOCUMENT_KINDS.map((item) => (
                <option key={item} value={item}>{DOCUMENT_KIND_LABELS[item]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`expires-${entityType}-${entityId}`}>Validade</Label>
            <Input id={`expires-${entityType}-${entityId}`} type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor={`title-${entityType}-${entityId}`}>Título opcional</Label>
            <Input id={`title-${entityType}-${entityId}`} value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Ex.: Contrato assinado" />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={upload} disabled={isPending} className="w-full">
              <Upload className="size-4" /> Enviar
            </Button>
          </div>
        </div>

        {error ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando documentos...</p>
        ) : documents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum documento enviado ainda. Limite máximo por arquivo: {maxLabel} MB.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => (
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
                      {document.fileName} · {formatSize(document.size)} · enviado em {formatDate(document.createdAt)}
                      {document.expiresAt ? ` · vence ${formatDate(document.expiresAt)}` : ""}
                    </p>
                    {document.rejectedReason ? <p className="mt-1 text-xs text-destructive">{document.rejectedReason}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button asChild size="sm" variant="outline">
                    <a href={`/api/documents/${document.id}/download`} target="_blank" rel="noreferrer">
                      <Download className="size-4" /> Baixar
                    </a>
                  </Button>
                  {canValidate ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => patchStatus(document.id, "validado")} disabled={isPending}>
                        <CheckCircle2 className="size-4" /> Validar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => patchStatus(document.id, "rejeitado")} disabled={isPending}>
                        <XCircle className="size-4" /> Rejeitar
                      </Button>
                    </>
                  ) : document.status === "validado" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                      <ShieldCheck className="size-4" /> validado
                    </span>
                  ) : null}
                  <Button size="sm" variant="destructive" onClick={() => remove(document.id)} disabled={isPending}>
                    <Trash2 className="size-4" /> Apagar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
