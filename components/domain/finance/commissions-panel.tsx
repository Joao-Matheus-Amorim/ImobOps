"use client";

import { S } from "@/lib/status";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export interface CommissionRow {
  id: string;
  brokerName: string;
  amountLabel: string;
  pctLabel: string;
  status: string;
  paidAtLabel: string | null;
}

export function CommissionsPanel({ rows }: { rows: CommissionRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markPaid(commissionId: string) {
    setBusy(commissionId);
    setError(null);
    try {
      const res = await fetch("/api/finance/commissions/mark-paid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commissionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Falha ao registrar (${res.status}).`);
      }
      router.refresh();
    } catch {
      setError("Não foi possível contatar o servidor.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comissões a corretores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma comissão registrada.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium">{row.brokerName}</p>
                <p className="text-xs text-muted-foreground">
                  {row.pctLabel}
                  {row.paidAtLabel ? ` · pago em ${row.paidAtLabel}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{row.amountLabel}</span>
                <StatusBadge status={row.status} />
                {row.status !== S.PAGA ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === row.id}
                    onClick={() => markPaid(row.id)}
                  >
                    {busy === row.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Marcar paga
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
