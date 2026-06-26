import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { guardPage } from "@/lib/guard-page";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { FUNNEL_ORDER, FUNNEL_STAGE_LABELS } from "@/lib/types/domain";
import { NewLeadDialog } from "@/components/domain/crm/new-lead-dialog";
import { LeadCard } from "@/components/domain/crm/lead-card";

export const metadata = { title: "CRM" };

export default async function CrmPage() {
  const { ctx } = await guardPage("crm");
  const principal = await getPrincipalCan();
  const leads = filterAllowed(principal, "crm", await crmRepository.listLeads(ctx));
  const allClients = await clientsRepository.list(ctx);
  const clientsById = new Map(allClients.map((c) => [c.id, c] as const));

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Crescimento"
        title="CRM"
        description={`${leads.length} leads no funil`}
        action={<NewLeadDialog clients={allClients.map((c) => ({ id: c.id, name: c.name }))} />}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {FUNNEL_ORDER.map((stage) => {
          const stageLeads = leads.filter((l) => l.funnelStage === stage);
          return (
            <Card key={stage}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">{FUNNEL_STAGE_LABELS[stage]}</CardTitle>
                <Badge variant="secondary">{stageLeads.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageLeads.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Vazio</p>
                ) : (
                  stageLeads.map((l) => {
                    const client = l.clientId ? clientsById.get(l.clientId) ?? null : null;
                    return (
                      <LeadCard
                        key={l.id}
                        leadId={l.id}
                        clientName={client?.name ?? "Lead sem cadastro"}
                        interest={l.interest}
                        source={l.source}
                        stage={l.funnelStage}
                      />
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
