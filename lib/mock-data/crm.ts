import type { CrmLead, CrmActivity } from "@/lib/types/domain";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";

const now = "2026-06-01T12:00:00.000Z";

function base(id: string) {
  return {
    id,
    tenancyId: DEMO_TENANCY_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: DEMO_USERS.admin,
  };
}

export const mockLeads: CrmLead[] = [
  {
    ...base("lead-00000001"),
    clientId: "client-00000004",
    source: "whatsapp",
    interest: "venda",
    assignedToUserId: DEMO_USERS.broker,
    funnelStage: "proposta",
    lostReason: null,
  },
  {
    ...base("lead-00000002"),
    clientId: "client-00000002",
    source: "site",
    interest: "locacao",
    assignedToUserId: DEMO_USERS.broker,
    funnelStage: "fechado_ganho",
    lostReason: null,
  },
  {
    ...base("lead-00000003"),
    clientId: null,
    source: "whatsapp",
    interest: "locacao",
    assignedToUserId: null,
    funnelStage: "novo",
    lostReason: null,
  },
  {
    ...base("lead-00000004"),
    clientId: null,
    source: "indicacao",
    interest: "venda",
    assignedToUserId: DEMO_USERS.admin,
    funnelStage: "qualificado",
    lostReason: null,
  },
];

export const mockActivities: CrmActivity[] = [
  {
    ...base("activity-00000001"),
    leadId: "lead-00000001",
    kind: "proposta",
    description: "Enviada contraproposta de R$ 830.000.",
    scheduledAt: null,
    doneAt: "2026-05-22T12:00:00.000Z",
    byUserId: DEMO_USERS.broker,
  },
  {
    ...base("activity-00000002"),
    leadId: "lead-00000004",
    kind: "visita",
    description: "Visita agendada à casa dos Ipês.",
    scheduledAt: "2026-06-20T14:00:00.000Z",
    doneAt: null,
    byUserId: DEMO_USERS.admin,
  },
];
