"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FUNNEL_ORDER, FUNNEL_STAGE_LABELS, type FunnelStage } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import { LeadDrawer, type DrawerLead } from "./lead-drawer";

export interface KanbanLead {
  id: string;
  clientName: string;
  interest: string;
  source: string;
  stage: FunnelStage;
}

// Accent color per stage column header.
const STAGE_ACCENT: Record<FunnelStage, string> = {
  novo: "text-sky-300",
  qualificado: "text-cyan-300",
  visita_agendada: "text-violet-300",
  proposta: "text-amber-300",
  fechado_ganho: "text-emerald-300",
  fechado_perdido: "text-rose-300",
};

function LeadCard({ lead, dragging }: { lead: KanbanLead; dragging?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/14 bg-background/40 p-3 text-sm shadow-sm",
        dragging && "rotate-2 border-primary/45 shadow-glow-sm",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{lead.clientName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lead.interest} · via {lead.source}
          </p>
        </div>
      </div>
    </div>
  );
}

function DraggableCard({ lead, onOpen }: { lead: KanbanLead; onOpen: (l: KanbanLead) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      // A bare click (no 5px drag) opens the detail drawer; dragging moves stage.
      onClick={() => onOpen(lead)}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

function Column({
  stage,
  leads,
  isOver,
  onOpen,
}: {
  stage: FunnelStage;
  leads: KanbanLead[];
  isOver: boolean;
  onOpen: (l: KanbanLead) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-2xl border bg-[#102f4d]/70 p-3 transition",
        isOver ? "border-primary/55 bg-primary/8" : "border-primary/14",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <p className={cn("text-sm font-semibold", STAGE_ACCENT[stage])}>
          {FUNNEL_STAGE_LABELS[stage]}
        </p>
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2">
        {leads.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Solte um lead aqui</p>
        ) : (
          leads.map((lead) => <DraggableCard key={lead.id} lead={lead} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialLeads }: { initialLeads: KanbanLead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<KanbanLead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<FunnelStage | null>(null);
  const [openLead, setOpenLead] = useState<DrawerLead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeLead = leads.find((l) => l.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    setOverStage(null);
    const leadId = String(e.active.id);
    const target = e.over?.id as FunnelStage | undefined;
    if (!target) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === target) return;

    const prevStage = lead.stage;
    let lostReason: string | null = null;
    if (target === "fechado_perdido") {
      lostReason = window.prompt("Motivo da perda (opcional):") || null;
    }

    // Optimistic move.
    setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, stage: target } : l)));

    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funnelStage: target, lostReason }),
    });
    if (!res.ok) {
      // Revert on failure.
      setLeads((cur) => cur.map((l) => (l.id === leadId ? { ...l, stage: prevStage } : l)));
      alert("Não foi possível mover o lead.");
      return;
    }
    router.refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragOver={(e) => setOverStage((e.over?.id as FunnelStage | undefined) ?? null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverStage(null);
      }}
    >
      <div className="flex gap-3 overflow-x-auto pb-3 thin-scrollbar">
        {FUNNEL_ORDER.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            leads={leads.filter((l) => l.stage === stage)}
            isOver={overStage === stage}
            onOpen={setOpenLead}
          />
        ))}
      </div>

      <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>

      <LeadDrawer lead={openLead} onClose={() => setOpenLead(null)} />
    </DndContext>
  );
}
