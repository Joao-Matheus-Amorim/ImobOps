"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FUNNEL_ORDER, FUNNEL_STAGE_LABELS, type FunnelStage } from "@/lib/types/domain";

export function LeadCard({
  leadId,
  clientName,
  interest,
  source,
  stage,
}: {
  leadId: string;
  clientName: string;
  interest: string;
  source: string;
  stage: FunnelStage;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(next: FunnelStage) {
    if (next === stage) return;
    let lostReason: string | undefined;
    if (next === "fechado_perdido") {
      lostReason = window.prompt("Motivo da perda (opcional):") ?? undefined;
    }
    setBusy(true);
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funnelStage: next, lostReason: lostReason || null }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("Não foi possível mover o lead.");
  }

  return (
    <div className="rounded-lg border border-border p-2.5 text-sm">
      <p className="font-medium">{clientName}</p>
      <p className="text-xs text-muted-foreground">
        {interest} · via {source}
      </p>
      <select
        value={stage}
        disabled={busy}
        onChange={(e) => void move(e.target.value as FunnelStage)}
        className="mt-2 h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        aria-label="Mover etapa"
      >
        {FUNNEL_ORDER.map((s) => (
          <option key={s} value={s}>
            {FUNNEL_STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
