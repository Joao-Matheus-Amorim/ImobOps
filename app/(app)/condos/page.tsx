import { Building } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListItem } from "@/components/ui/list-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { guardPage } from "@/lib/guard-page";
import { condosRepository } from "@/lib/repositories/condos.repository";
import { routes } from "@/lib/routes";

export const metadata = { title: "Condomínios" };

export default function CondosPage() {
  const { ctx } = guardPage("condos");
  const condos = condosRepository.list(ctx);

  return (
    <div className="space-y-4">
      <PageHeader badge="Condomínio" title="Condomínios" description={`${condos.length} administrados`} action={<Button size="sm">Novo condomínio</Button>} />
      {condos.length === 0 ? (
        <EmptyState title="Nenhum condomínio" icon={<Building className="size-8" />} />
      ) : (
        <div className="space-y-2">
          {condos.map((c) => {
            const fees = condosRepository.listFees(ctx, c.id);
            const overdue = fees.filter((f) => f.status === "atrasado").length;
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
