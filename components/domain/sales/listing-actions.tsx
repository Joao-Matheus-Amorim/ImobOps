"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Loader2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };

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
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-primary/18 bg-[#102f4d] p-6 shadow-2xl thin-scrollbar">
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

export function ListingActions({
  listingId,
  clients,
  brokers,
}: {
  listingId: string;
  clients: Option[];
  brokers: Option[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "proposal" | "sale">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // proposal fields
  const [buyerClientId, setBuyerClientId] = useState("");
  const [brokerUserId, setBrokerUserId] = useState("");
  const [offeredPrice, setOfferedPrice] = useState("");
  const [conditions, setConditions] = useState("");

  // sale fields
  const [sellerClientId, setSellerClientId] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  function close() {
    setMode(null);
    setError(null);
    setBuyerClientId("");
    setBrokerUserId("");
    setOfferedPrice("");
    setConditions("");
    setSellerClientId("");
    setFinalPrice("");
    setSignedAt("");
    setPaymentTerms("");
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
      return false;
    }
    close();
    router.refresh();
    return true;
  }

  async function submitProposal(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(offeredPrice);
    if (!(price > 0)) return setError("Valor ofertado inválido.");
    await post("/api/proposals", {
      listingId,
      buyerClientId,
      brokerUserId,
      offeredPrice: price,
      conditions: conditions.trim() || null,
    });
  }

  async function submitSale(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(finalPrice);
    if (!(price > 0)) return setError("Valor final inválido.");
    if (buyerClientId && buyerClientId === sellerClientId) {
      return setError("Comprador e vendedor devem ser diferentes.");
    }
    await post("/api/sales/contracts", {
      listingId,
      buyerClientId,
      sellerClientId,
      finalPrice: price,
      signedAt: signedAt || null,
      paymentTerms: paymentTerms.trim() || null,
      brokerUserId: brokerUserId || null,
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setMode("proposal")}>
        <Handshake /> Registrar proposta
      </Button>
      <Button size="sm" onClick={() => setMode("sale")}>
        <CheckCircle2 /> Fechar venda
      </Button>

      {mode === "proposal" ? (
        <Modal title="Registrar proposta" onClose={close}>
          <form onSubmit={submitProposal} className="space-y-4">
            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="buyer">Comprador</Label>
              <select id="buyer" value={buyerClientId} onChange={(e) => setBuyerClientId(e.target.value)} className={selectClass} required>
                <option value="">Selecione…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="broker">Corretor</Label>
              <select id="broker" value={brokerUserId} onChange={(e) => setBrokerUserId(e.target.value)} className={selectClass} required>
                <option value="">Selecione…</option>
                {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offered">Valor ofertado (R$)</Label>
              <Input id="offered" type="number" min={0} step="0.01" value={offeredPrice} onChange={(e) => setOfferedPrice(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conditions">Condições (opcional)</Label>
              <Input id="conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Ex.: financiamento, sinal de 20%…" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Registrar</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {mode === "sale" ? (
        <Modal title="Fechar venda" onClose={close}>
          <form onSubmit={submitSale} className="space-y-4">
            {error ? (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="s-buyer">Comprador</Label>
                <select id="s-buyer" value={buyerClientId} onChange={(e) => setBuyerClientId(e.target.value)} className={selectClass} required>
                  <option value="">Selecione…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-seller">Vendedor</Label>
                <select id="s-seller" value={sellerClientId} onChange={(e) => setSellerClientId(e.target.value)} className={selectClass} required>
                  <option value="">Selecione…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="final">Valor final (R$)</Label>
                <Input id="final" type="number" min={0} step="0.01" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signed">Assinado em (opcional)</Label>
                <Input id="signed" type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="terms">Forma de pagamento (opcional)</Label>
              <Input id="terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ex.: à vista, financiamento Caixa…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-broker">Corretor da venda (gera comissão)</Label>
              <select id="s-broker" aria-label="Corretor da venda" value={brokerUserId} onChange={(e) => setBrokerUserId(e.target.value)} className={selectClass}>
                <option value="">Sem comissão</option>
                {brokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Ao fechar, o anúncio é marcado como vendido. Se um corretor for
              informado, a comissão é gerada automaticamente pelo % do anúncio.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null} Fechar venda</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
