"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteResourceButton({
  endpoint,
  label,
}: {
  endpoint: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setErrorText(null);
    const res = await fetch(endpoint, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorText(body?.error ?? "Não foi possível remover o registro.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Remover ${label}`}
        title={`Remover ${label}`}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-primary/14 bg-card/70 px-3 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
      >
        <Trash2 className="size-4" />
        <span className="hidden sm:inline">Excluir</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-destructive/10">
              <TriangleAlert className="size-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Remover {label}?</DialogTitle>
            <DialogDescription className="text-center">
              Esta ação não pode ser desfeita. Os dados serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>

          {errorText && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorText}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-center">
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={confirmDelete}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {busy ? "Removendo..." : "Sim, remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
