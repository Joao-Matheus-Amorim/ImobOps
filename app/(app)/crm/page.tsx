import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { guardPage } from "@/lib/guard-page";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { FUNNEL_ORDER, FUNNEL_STAGE_LABELS } from "@/lib/types/domain";

export const metadata = { title: "CRM" };

export default function CrmPage() {
  const { ctx } = guardPage("crm");
  const principal = getPrincipalCan();
  const leads = filterAllowed(principal, "crm", crmRepository.listLeads(ctx));

  return (
    <div className="space-y-4">
      <PageHeader badge="Crescimento" title="CRM" description={`${leads.length} leads no funil`} />

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
                    const client = l.clientId ? clientsRepository.get(ctx, l.clientId) : null;
                    return (
                      <div key={l.id} className="rounded-lg border border-border p-2.5 text-sm">
                        <p className="font-medium">{client?.name ?? "Lead sem cadastro"}</p>
                        <p className="text-xs text-muted-foreground">{l.interest} · via {l.source}</p>
                      </div>
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
