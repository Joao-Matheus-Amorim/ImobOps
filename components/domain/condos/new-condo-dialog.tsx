"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewCondoDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [unitCount, setUnitCount] = useState("");
  const [adminFeePct, setAdminFeePct] = useState("");

  function reset() {
    setName("");
    setAddress("");
    setUnitCount("");
    setAdminFeePct("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError("Informe o nome e o endereço.");
      return;
    }
    const unitCountNum = Number(unitCount);
    const adminFeePctNum = Number(adminFeePct);
    if (!Number.isInteger(unitCountNum) || unitCountNum <= 0) {
      setError("Informe um número de unidades válido.");
      return;
    }
    if (Number.isNaN(adminFeePctNum) || adminFeePctNum < 0 || adminFeePctNum > 100) {
      setError("Informe uma taxa administrativa válida (0-100).");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch("/api/condos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        address: address.trim(),
        unitCount: unitCountNum,
        adminFeePct: adminFeePctNum,
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível criar o condomínio.");
      return;
    }

    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Plus /> Novo condomínio
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Novo condomínio</h2>
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

              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unitCount">Unidades</Label>
                  <Input
                    id="unitCount"
                    type="number"
                    min={1}
                    value={unitCount}
                    onChange={(e) => setUnitCount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminFeePct">Taxa adm. (%)</Label>
                  <Input
                    id="adminFeePct"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={adminFeePct}
                    onChange={(e) => setAdminFeePct(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Salvar condomínio
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
