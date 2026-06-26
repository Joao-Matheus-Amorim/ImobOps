"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RENTAL_STATUS_LABELS,
  type IndexType,
  type RentalContract,
  type RentalStatus,
} from "@/lib/types/domain";

const STATUS_OPTIONS = Object.entries(RENTAL_STATUS_LABELS) as [RentalStatus, string][];
const INDEX_OPTIONS: { value: IndexType; label: string }[] = [
  { value: "igpm", label: "IGPM" },
  { value: "ipca", label: "IPCA" },
  { value: "none", label: "Sem reajuste" },
];

// Edits contract metadata (value, due day, fees, term, status). Does not rewrite
// installments already generated for the contract.
export function EditRentalDialog({
  contract,
  trigger,
}: {
  contract: RentalContract;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlyValue, setMonthlyValue] = useState(String(contract.monthlyValue));
  const [dueDay, setDueDay] = useState(String(contract.dueDay));
  const [adminFeePct, setAdminFeePct] = useState(String(contract.adminFeePct));
  const [endDate, setEndDate] = useState(contract.endDate.slice(0, 10));
  const [indexType, setIndexType] = useState<IndexType>(contract.indexType);
  const [status, setStatus] = useState<RentalStatus>(contract.status);

  function reset() {
    setMonthlyValue(String(contract.monthlyValue));
    setDueDay(String(contract.dueDay));
    setAdminFeePct(String(contract.adminFeePct));
    setEndDate(contract.endDate.slice(0, 10));
    setIndexType(contract.indexType);
    setStatus(contract.status);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const monthlyValueNum = Number(monthlyValue);
    const dueDayNum = Number(dueDay);
    const adminFeePctNum = Number(adminFeePct);
    if (!(monthlyValueNum > 0)) {
      setError("Informe um valor mensal válido.");
      return;
    }
    if (!Number.isInteger(dueDayNum) || dueDayNum < 1 || dueDayNum > 28) {
      setError("Dia de vencimento deve estar entre 1 e 28.");
      return;
    }
    if (Number.isNaN(adminFeePctNum) || adminFeePctNum < 0 || adminFeePctNum > 100) {
      setError("Taxa administrativa inválida (0-100).");
      return;
    }

    setBusy(true);
    setError(null);
    const res = await fetch(`/api/rentals/${contract.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthlyValue: monthlyValueNum,
        dueDay: dueDayNum,
        adminFeePct: adminFeePctNum,
        endDate,
        indexType,
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
              <h2 className="text-lg font-semibold text-foreground">Editar contrato</h2>
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
                  <Label htmlFor="monthlyValue">Valor mensal (R$)</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">Fim da vigência</Label>
                  <DateTimePicker value={endDate} onChange={setEndDate} placeholder="Selecionar data final" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="indexType">Índice de reajuste</Label>
                  <select
                    id="indexType"
                    value={indexType}
                    onChange={(e) => setIndexType(e.target.value as IndexType)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {INDEX_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RentalStatus)}
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
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
