"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, QrCode, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";

export interface BillingRow {
  installmentId: string;
  referenceLabel: string;
  dueDateLabel: string;
  amountLabel: string;
  installmentStatus: string;
  charge: {
    id: string;
    method: string;
    effectiveStatus: string;
    boletoUrl: string | null;
    pixPayload: string | null;
  } | null;
}

export function BillingPanel({ rows }: { rows: BillingRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function emit(installmentId: string, method: "boleto" | "pix") {
    setBusy(`${installmentId}:${method}`);
    try {
      await fetch("/api/billing/charges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ installmentId, method }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function markPaid(chargeId: string) {
    setBusy(`paid:${chargeId}`);
    try {
      await fetch("/api/billing/charges/mark-paid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chargeId }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobranças (boleto / PIX)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {rows.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma parcela em aberto.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.installmentId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {row.referenceLabel} · venc. {row.dueDateLabel}
                </p>
                <p className="text-xs text-muted-foreground">{row.amountLabel}</p>
              </div>

              <div className="flex items-center gap-2">
                {row.charge ? (
                  <>
                    <StatusBadge status={row.charge.effectiveStatus} />
                    <Badge variant="outline">{row.charge.method}</Badge>
                    {row.charge.boletoUrl ? (
                      <a
                        href={row.charge.boletoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground transition hover:text-primary"
                        title="Abrir boleto"
                      >
                        <FileText className="size-4" />
                      </a>
                    ) : null}
                    {row.charge.effectiveStatus !== "paga" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === `paid:${row.charge.id}`}
                        onClick={() => markPaid(row.charge!.id)}
                      >
                        {busy === `paid:${row.charge.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        Dar baixa
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `${row.installmentId}:boleto`}
                      onClick={() => emit(row.installmentId, "boleto")}
                    >
                      {busy === `${row.installmentId}:boleto` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                      Boleto
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy === `${row.installmentId}:pix`}
                      onClick={() => emit(row.installmentId, "pix")}
                    >
                      {busy === `${row.installmentId}:pix` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <QrCode className="size-4" />
                      )}
                      PIX
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
