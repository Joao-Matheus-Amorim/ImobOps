"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Sends an existing charge (boleto/PIX) to its client over WhatsApp.
export function SendChargeButton({ chargeId }: { chargeId: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    if (busy || sent) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/charges/send-whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      const data = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string; error?: string };
      if (!res.ok || data.sent === false) {
        alert(data.reason ?? data.error ?? "Não foi possível enviar.");
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={send}
      disabled={busy || sent}
      title={sent ? "Enviado" : "Enviar pelo WhatsApp"}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition",
        sent
          ? "border-emerald-500/40 text-emerald-400"
          : "border-primary/25 text-muted-foreground hover:border-primary/50 hover:text-primary",
      )}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
      {sent ? "Enviado" : "WhatsApp"}
    </button>
  );
}
