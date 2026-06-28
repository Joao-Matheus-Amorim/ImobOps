// Calendar repository. Owns manual events (calendar_events table) and aggregates
// operational events (CRM visits, charge due dates, contract start/end, condo
// meetings) into one unified feed for the calendar UI.
import { S } from "@/lib/status";
import type { CalendarEvent, CalendarTone } from "@/lib/types/domain";
import { type RepoContext } from "./base";
import { Collection } from "./collection";
import { crmRepository } from "./crm.repository";
import { billingRepository } from "./billing.repository";
import { rentalsRepository } from "./rentals.repository";
import { condosRepository } from "./condos.repository";
import { automationRepository } from "./automation.repository";

const events = new Collection<CalendarEvent>("calendarEvents", "calendar_events");

// A normalized event for the calendar grid. `source` says where it came from;
// only "manual" ones are editable/deletable.
export interface UnifiedEvent {
  id: string;
  manualId?: string;
  title: string;
  startsAt: string; // ISO
  tone: CalendarTone;
  source: "manual" | "visit" | "charge" | "contract" | "meeting" | "automation";
  href?: string;
}

export const calendarRepository = {
  // --- Manual events (persisted) ---

  list(ctx: RepoContext): Promise<CalendarEvent[]> {
    return events.list(ctx);
  },

  create(
    ctx: RepoContext,
    data: Omit<CalendarEvent, "id" | "tenancyId" | "createdAt" | "updatedAt" | "createdBy">,
  ): Promise<CalendarEvent> {
    return events.create(ctx, data);
  },

  remove(ctx: RepoContext, id: string): Promise<boolean> {
    return events.remove(ctx, id);
  },

  // --- Unified feed: manual + operational, normalized ---

  async listUnified(ctx: RepoContext): Promise<UnifiedEvent[]> {
    const [manual, activities, charges, rentals, condos, meetings, automations] = await Promise.all([
      events.list(ctx),
      crmRepository.listActivities(ctx),
      billingRepository.list(ctx),
      rentalsRepository.list(ctx),
      condosRepository.list(ctx).catch(() => []),
      condosRepository.listMeetings(ctx).catch(() => []),
      automationRepository.listRules(ctx).catch(() => []),
    ]);
    const condoName = new Map(condos.map((c) => [c.id, c.name]));

    const out: UnifiedEvent[] = [];

    for (const e of manual) {
      out.push({ id: `m-${e.id}`, manualId: e.id, title: e.title, startsAt: e.startsAt, tone: e.tone, source: "manual" });
    }

    // CRM visits / scheduled activities.
    for (const a of activities) {
      if (!a.scheduledAt) continue;
      out.push({
        id: `v-${a.id}`,
        title: a.description ?? (a.kind === "visita" ? "Visita agendada" : "Atividade"),
        startsAt: a.scheduledAt,
        tone: "visit",
        source: "visit",
      });
    }

    // Charge due dates (boleto/PIX).
    for (const c of charges) {
      if (c.status === S.PAGA || c.status === S.CANCELADA) continue;
      out.push({
        id: `c-${c.id}`,
        title: `Vencimento: ${c.customerName ?? c.description ?? "cobrança"}`,
        startsAt: `${c.dueDate}T09:00:00`,
        tone: "payment",
        source: "charge",
      });
    }

    // Rental contract start/end.
    for (const r of rentals) {
      out.push({ id: `rs-${r.id}`, title: "Início de contrato", startsAt: `${r.startDate}T09:00:00`, tone: "task", source: "contract", href: `/rentals/${r.id}` });
      out.push({ id: `re-${r.id}`, title: "Fim de contrato", startsAt: `${r.endDate}T09:00:00`, tone: "board", source: "contract", href: `/rentals/${r.id}` });
    }

    // Condo meetings.
    for (const m of meetings) {
      out.push({
        id: `me-${m.id}`,
        title: `Assembleia: ${condoName.get(m.condoId) ?? "condomínio"}`,
        startsAt: `${m.date}T19:00:00`,
        tone: "meeting",
        source: "meeting",
        href: `/condos/${m.condoId}`,
      });
    }

    // Automation rules show up as operational tasks at their next execution time.
    for (const rule of automations) {
      if (!rule.nextRunAt) continue;
      out.push({
        id: `a-${rule.id}`,
        title: `Automação: ${rule.name}`,
        startsAt: rule.nextRunAt,
        tone: "task",
        source: "automation",
        href: `/calendar?automation=${rule.id}`,
      });
    }

    return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },
};
