"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Send, Copy, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ClientOption {
  id: string;
  name: string;
}

interface CreatedCharge {
  id: string;
  method: string;
  boletoUrl: string | null;
  pixPayload: string | null;
  status: string;
}

// When clientId is provided (e.g. from a client page), the picker is hidden and the
// charge is pre-addressed to that client.
export function NewChargeForm({
  clients,
  fixedClientId,
  fixedClientName,
  startOpen = false,
}: {
  clients?: ClientOption[];
  fixedClientId?: string;
  fixedClientName?: string;
  startOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState<"boleto" | "pix">("boleto");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCharge | null>(null);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!clientId) return setError("Selecione um cliente.");
    if (!value || value <= 0) return setError("Informe um valor válido.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return setError("Informe o vencimento.");

    setBusy(true);
    try {
      const res = await fetch("/api/billing/charges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId,
          amount: value,
          dueDate,
          method,
          description: description || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `Falha ao emitir (${res.status}).`);
      } else if (data?.charge?.status === "falha") {
        setError("O gateway recusou a emissão. Veja o terminal do servidor.");
      } else {
        setCreated(data.charge);
      }
      router.refresh();
    } catch {
      setError("Não foi possível contatar o servidor.");
    } finally {
      setBusy(false);
    }
  }

  async function sendWhatsApp() {
    if (!created) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/charges/send-whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chargeId: created.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Falha ao enviar por WhatsApp.");
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCreated(null);
    setSent(false);
    setAmount("");
    setDueDate("");
    setDescription("");
    if (!fixedClientId) setClientId("");
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Nova cobrança
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>
          Nova cobrança{fixedClientName ? ` — ${fixedClientName}` : ""}
        </CardTitle>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-muted-foreground transition hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {created ? (
          <div className="space-y-3">
            <p className="text-sm">
              Cobrança criada ({created.method}). Envie ao cliente:
            </p>
            {created.boletoUrl ? (
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <a
                  href={created.boletoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-primary underline"
                >
                  Abrir boleto
                </a>
              </div>
            ) : null}
            {created.pixPayload ? (
              <div className="flex items-center gap-2">
                <span className="truncate rounded bg-muted px-2 py-1 text-xs">
                  {created.pixPayload}
                </span>
                <button
                  type="button"
                  title="Copiar PIX"
                  onClick={() => navigator.clipboard?.writeText(created.pixPayload!)}
                  className="text-muted-foreground transition hover:text-primary"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button onClick={sendWhatsApp} disabled={busy || sent}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {sent ? "Enviado" : "Enviar WhatsApp"}
              </Button>
              <Button variant="outline" onClick={reset}>
                Nova
              </Button>
            </div>
          </div>
        ) : (
          <>
            {fixedClientId ? null : (
              <div className="space-y-1">
                <Label>Cliente</Label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione…</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor (R$)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Vencimento</Label>
                <DateTimePicker value={dueDate} onChange={setDueDate} placeholder="Selecionar vencimento" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex.: Taxa de elaboração de contrato"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Método</Label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as "boleto" | "pix")}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="boleto">Boleto</option>
                <option value="pix">PIX</option>
              </select>
            </div>

            <Button onClick={submit} disabled={busy} className="w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Gerar cobrança
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
