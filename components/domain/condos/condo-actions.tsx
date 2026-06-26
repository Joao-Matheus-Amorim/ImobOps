"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt, FileStack, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const thisMonth = new Date().toISOString().slice(0, 7);

export function CondoActions({ condoId, unitCount }: { condoId: string; unitCount: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "expense" | "fees">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // expense
  const [referenceMonth, setReferenceMonth] = useState(thisMonth);
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [apportionment, setApportionment] = useState("igual");

  // fees
  const [feeMonth, setFeeMonth] = useState(thisMonth);
  const [dueDate, setDueDate] = useState("");
  const [feeAmount, setFeeAmount] = useState("");

  function close() {
    setMode(null);
    setError(null);
    setDescription("");
    setTotalAmount("");
    setDueDate("");
    setFeeAmount("");
  }

  async function post(url: string, payload: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Não foi possível salvar.");
      return;
    }
    close();
    router.refresh();
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(totalAmount);
    if (!(amount > 0)) return setError("Valor inválido.");
    await post(`/api/condos/${condoId}/expenses`, {
      referenceMonth,
      description: description.trim(),
      totalAmount: amount,
      apportionment,
    });
  }

  async function submitFees(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(feeAmount);
    if (!(amount > 0)) return setError("Valor inválido.");
    await post(`/api/condos/${condoId}/fees`, {
      referenceMonth: feeMonth,
      dueDate,
      amount,
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setMode("expense")}>
        <Receipt /> Lançar despesa
      </Button>
      <Button size="sm" onClick={() => setMode("fees")}>
        <FileStack /> Gerar taxas
      </Button>

      {mode === "expense" ? (
        <Modal title="Lançar despesa" onClose={close}>
          <form onSubmit={submitExpense} className="space-y-4">
            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="desc">Descrição</Label>
              <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: manutenção do elevador" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-month">Mês de referência</Label>
                <Input id="exp-month" type="month" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-total">Valor total (R$)</Label>
                <Input id="exp-total" type="number" min={0} step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apportionment">Rateio</Label>
              <select id="apportionment" aria-label="Rateio" value={apportionment} onChange={(e) => setApportionment(e.target.value)} className={selectClass}>
                <option value="igual">Igual entre unidades</option>
                <option value="fracao_ideal">Por fração ideal</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Lançar</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {mode === "fees" ? (
        <Modal title="Gerar taxas do mês" onClose={close}>
          <form onSubmit={submitFees} className="space-y-4">
            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Gera uma taxa para cada uma das {unitCount} unidade(s) do condomínio.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fee-month">Mês de referência</Label>
                <Input id="fee-month" type="month" value={feeMonth} onChange={(e) => setFeeMonth(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fee-due">Vencimento</Label>
                <Input id="fee-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee-amount">Valor por unidade (R$)</Label>
              <Input id="fee-amount" type="number" min={0} step="0.01" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={busy || unitCount === 0}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Gerar taxas
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
