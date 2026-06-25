"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ListingStatus, SaleListing } from "@/lib/types/domain";

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "ativa", label: "Ativa" },
  { value: "sob_proposta", label: "Sob proposta" },
  { value: "vendida", label: "Vendida" },
  { value: "cancelada", label: "Cancelada" },
];

// Edits an existing sale listing (price, commission, status). The property a
// listing points to is fixed at creation, so it is not editable here.
export function EditListingDialog({
  listing,
  trigger,
}: {
  listing: SaleListing;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [askingPrice, setAskingPrice] = useState(String(listing.askingPrice));
  const [commissionPct, setCommissionPct] = useState(String(listing.commissionPct));
  const [status, setStatus] = useState<ListingStatus>(listing.status);

  function reset() {
    setAskingPrice(String(listing.askingPrice));
    setCommissionPct(String(listing.commissionPct));
    setStatus(listing.status);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(askingPrice);
    const commissionNum = Number(commissionPct);
    if (!(priceNum > 0)) {
      setError("Informe um valor pedido válido.");
      return;
    }
    if (Number.isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setError("Informe uma comissão válida (0-100).");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/sales/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        askingPrice: priceNum,
        commissionPct: commissionNum,
        status,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível salvar as alterações.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {trigger}
      </span>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Editar listagem</h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {error ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="askingPrice">Valor pedido (R$)</Label>
                  <Input
                    id="askingPrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commissionPct">Comissão (%)</Label>
                  <Input
                    id="commissionPct"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ListingStatus)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar alterações
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
