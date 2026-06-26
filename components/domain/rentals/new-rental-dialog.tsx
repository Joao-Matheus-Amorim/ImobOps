"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PropertyOption = { id: string; address: string };
type ClientOption = { id: string; name: string };

const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewRentalDialog({
  properties,
  clients,
}: {
  properties: PropertyOption[];
  clients: ClientOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [landlordClientId, setLandlordClientId] = useState("");
  const [tenantClientId, setTenantClientId] = useState("");
  const [guarantorClientId, setGuarantorClientId] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [startDate, setStartDate] = useState("");
  const [durationMonths, setDurationMonths] = useState("12");

  function reset() {
    setPropertyId("");
    setLandlordClientId("");
    setTenantClientId("");
    setGuarantorClientId("");
    setMonthlyValue("");
    setDueDay("10");
    setStartDate("");
    setDurationMonths("12");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(monthlyValue);
    if (!(value > 0)) {
      setError("Informe um valor mensal válido.");
      return;
    }
    if (landlordClientId && landlordClientId === tenantClientId) {
      setError("Locador e locatário devem ser diferentes.");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch("/api/rentals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        landlordClientId,
        tenantClientId,
        guarantorClientId: guarantorClientId || null,
        monthlyValue: value,
        dueDay: Number(dueDay),
        startDate,
        durationMonths: Number(durationMonths),
      }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível criar a locação.");
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
        <Plus /> Nova locação
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl thin-scrollbar">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Nova locação</h2>
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
                <Label htmlFor="propertyId">Imóvel</Label>
                <select
                  id="propertyId"
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">Selecione…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="landlordClientId">Locador</Label>
                  <select
                    id="landlordClientId"
                    value={landlordClientId}
                    onChange={(e) => setLandlordClientId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="">Selecione…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tenantClientId">Locatário</Label>
                  <select
                    id="tenantClientId"
                    value={tenantClientId}
                    onChange={(e) => setTenantClientId(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="">Selecione…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guarantorClientId">Fiador (opcional)</Label>
                <select
                  id="guarantorClientId"
                  value={guarantorClientId}
                  onChange={(e) => setGuarantorClientId(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Sem fiador</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyValue">Aluguel mensal (R$)</Label>
                  <Input
                    id="monthlyValue"
                    type="number"
                    min={0}
                    step="0.01"
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDay">Dia de vencimento</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min={1}
                    max={28}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="durationMonths">Duração (meses)</Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    min={1}
                    max={120}
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                As parcelas de aluguel são geradas automaticamente para todo o período.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Criar locação
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
