import { Building } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListItem } from "@/components/ui/list-item";
import { Badge } from "@/components/ui/badge";
import { guardPage } from "@/lib/guard-page";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { routes } from "@/lib/routes";
import { NewCondoDialog } from "@/components/domain/condos/new-condo-dialog";

export const metadata = { title: "Condomínios" };

export default async function CondosPage() {
  const { ctx } = await guardPage("condos");
  const condos = await condosRepository.list(ctx);
  const overdueByCondo = await condosRepository.overdueFeeCountByCondo(ctx);

  return (
    <div className="space-y-4">
      <PageHeader badge="Condomínio" title="Condomínios" description={`${condos.length} administrados`} action={<NewCondoDialog />} />
      {condos.length === 0 ? (
        <EmptyState title="Nenhum condomínio" icon={<Building className="size-8" />} />
      ) : (
        <div className="space-y-2">
          {condos.map((c) => {
            const overdue = overdueByCondo.get(c.id) ?? 0;
            return (
              <ListItem
                key={c.id}
                href={routes.condo(c.id)}
                title={c.name}
                subtitle={`${c.unitCount} unidades · taxa adm ${c.adminFeePct}%`}
                trailing={overdue > 0 ? <Badge variant="destructive">{overdue} inadimplente(s)</Badge> : <Badge variant="success">Em dia</Badge>}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
