import { PageHeader } from "@/components/ui/page-header";
import { guardPage } from "@/lib/guard-page";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { NewLeadDialog } from "@/components/domain/crm/new-lead-dialog";
import { KanbanBoard, type KanbanLead } from "@/components/domain/crm/kanban-board";

export const metadata = { title: "CRM" };

export default async function CrmPage() {
  const { ctx } = await guardPage("crm");
  const principal = await getPrincipalCan();
  const leads = filterAllowed(principal, "crm", await crmRepository.listLeads(ctx));
  const allClients = await clientsRepository.list(ctx);
  const clientsById = new Map(allClients.map((c) => [c.id, c] as const));

  const kanbanLeads: KanbanLead[] = leads.map((l) => ({
    id: l.id,
    clientName: l.clientId ? clientsById.get(l.clientId)?.name ?? "Lead sem cadastro" : "Lead sem cadastro",
    interest: l.interest,
    source: l.source,
    stage: l.funnelStage,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Crescimento"
        title="CRM"
        description={`${leads.length} leads no funil · arraste para mover de etapa`}
        action={<NewLeadDialog clients={allClients.map((c) => ({ id: c.id, name: c.name }))} />}
      />

      <KanbanBoard initialLeads={kanbanLeads} />
    </div>
  );
}
