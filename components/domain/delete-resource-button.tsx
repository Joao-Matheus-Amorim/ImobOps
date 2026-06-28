"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteResourceButton({
  endpoint,
  label,
}: {
  endpoint: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Remover ${label}? Esta ação não pode ser desfeita.`)) return;

    setBusy(true);
    const res = await fetch(endpoint, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      alert(body?.error ?? "Não foi possível remover o registro.");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      aria-label={`Remover ${label}`}
      title={`Remover ${label}`}
      disabled={busy}
      onClick={remove}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/14 bg-card/70 px-3 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      <span className="hidden sm:inline">Excluir</span>
    </button>
  );
}
