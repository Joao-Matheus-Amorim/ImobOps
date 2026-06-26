"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Phone,
  MapPin,
  MessageCircle,
  Mail,
  FileText,
  StickyNote,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FUNNEL_STAGE_LABELS, type FunnelStage, type ActivityKind } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

export interface DrawerLead {
  id: string;
  clientName: string;
  interest: string;
  source: string;
  stage: FunnelStage;
}

interface Activity {
  id: string;
  kind: ActivityKind;
  description: string | null;
  scheduledAt: string | null;
  doneAt: string | null;
  createdAt: string;
}

const KIND_LABEL: Record<ActivityKind, string> = {
  ligacao: "Ligação",
  visita: "Visita",
  whatsapp: "WhatsApp",
  email: "E-mail",
  proposta: "Proposta",
  nota: "Nota",
};

const KIND_ICON: Record<ActivityKind, typeof Phone> = {
  ligacao: Phone,
  visita: MapPin,
  whatsapp: MessageCircle,
  email: Mail,
  proposta: FileText,
  nota: StickyNote,
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function LeadDrawer({
  lead,
  onClose,
}: {
  lead: DrawerLead | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState<ActivityKind>("nota");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setActivities([]);
    setLoading(true);
    fetch(`/api/crm/leads/${lead.id}/activities`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { activities: [] }))
      .then((d: { activities: Activity[] }) => setActivities(d.activities ?? []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [lead]);

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || !description.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/crm/leads/${lead.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, description: description.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      const { activity } = (await res.json()) as { activity: Activity };
      setActivities((cur) => [activity, ...cur]);
      setDescription("");
      router.refresh();
    } else {
      alert("Não foi possível registrar a atividade.");
    }
  }

  const open = Boolean(lead);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-primary/18 bg-[#0c2740] shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {lead ? (
          <>
            <div className="flex items-start justify-between border-b border-primary/12 p-5">
              <div>
                <p className="section-label text-primary/80">Lead</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">{lead.clientName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{FUNNEL_STAGE_LABELS[lead.stage]}</Badge>
                  <Badge variant="outline">{lead.interest}</Badge>
                  <span className="text-xs text-muted-foreground">via {lead.source}</span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Add activity */}
            <form onSubmit={addActivity} className="space-y-3 border-b border-primary/12 p-5">
              <p className="section-label text-primary/80">Registrar atividade</p>
              <div className="flex gap-2">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ActivityKind)}
                  className="h-10 shrink-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {(Object.keys(KIND_LABEL) as ActivityKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a interação…"
                  className="h-10 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" disabled={saving || !description.trim()}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : "Add"}
                </Button>
              </div>
            </form>

            {/* Timeline */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5 thin-scrollbar">
              <p className="section-label text-primary/80">Histórico</p>
              {loading ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma atividade ainda.
                </p>
              ) : (
                activities.map((a) => {
                  const Icon = KIND_ICON[a.kind];
                  return (
                    <div key={a.id} className="flex gap-3">
                      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-primary/12 bg-background/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{KIND_LABEL[a.kind]}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatWhen(a.scheduledAt ?? a.doneAt ?? a.createdAt)}
                          </span>
                        </div>
                        {a.description ? (
                          <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : null}
      </aside>
    </>
  );
}
