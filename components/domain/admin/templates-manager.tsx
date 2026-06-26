"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Loader2, MessageSquareText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  title: string;
  body: string;
  active: boolean;
}

export function TemplatesManager({ initial }: { initial: Template[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(t: Template | "new") {
    setEditing(t);
    setError(null);
    if (t === "new") {
      setTitle("");
      setBody("");
      setActive(true);
    } else {
      setTitle(t.title);
      setBody(t.body);
      setActive(t.active);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const isNew = editing === "new";
    const url = isNew ? "/api/whatsapp/templates" : `/api/whatsapp/templates/${(editing as Template).id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, active }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Falha ao salvar.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este modelo de mensagem?")) return;
    const res = await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Não foi possível excluir.");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="size-4 text-primary" /> Modelos de mensagem (WhatsApp)
        </CardTitle>
        <Button size="sm" onClick={() => open("new")}>
          <Plus /> Novo modelo
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {initial.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum modelo. Crie respostas rápidas para o atendimento no WhatsApp.
          </p>
        ) : (
          initial.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                  {!t.active ? <Badge variant="outline">inativo</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{t.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => open(t)} aria-label="Editar" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                  <Pencil className="size-4" />
                </button>
                <button type="button" onClick={() => remove(t.id)} aria-label="Excluir" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {editing === "new" ? "Novo modelo" : "Editar modelo"}
              </h2>
              <button type="button" aria-label="Fechar" onClick={() => setEditing(null)} className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="t-title">Título</Label>
                <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Boas-vindas ao lead" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-body">Mensagem</Label>
                <textarea
                  id="t-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Olá {nome}! Como posso ajudar?"
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Variáveis disponíveis: <code className="text-primary">{"{nome}"}</code>{" "}
                  <code className="text-primary">{"{telefone}"}</code> — preenchidas com o contato ao enviar.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                Ativo (aparece no inbox)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
