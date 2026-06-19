import { Contact } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListItem } from "@/components/ui/list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { routes } from "@/lib/routes";

export const metadata = { title: "Clientes" };

export default function ClientsPage() {
  const { ctx } = guardPage("clients");
  const principal = getPrincipalCan();
  const clients = filterAllowed(principal, "clients", clientsRepository.list(ctx));
  const canCreate = principal && true;

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Carteira"
        title="Clientes"
        description={`${clients.length} cadastrados`}
        action={canCreate ? <Button size="sm">Novo cliente</Button> : undefined}
      />
      {clients.length === 0 ? (
        <EmptyState title="Nenhum cliente visível" description="Ajuste seu escopo ou cadastre um novo cliente." icon={<Contact className="size-8" />} />
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <ListItem
              key={c.id}
              href={routes.client(c.id)}
              title={c.name}
              subtitle={`${c.kind.toUpperCase()} · ${c.document ?? "sem documento"}`}
              trailing={
                <div className="flex flex-wrap justify-end gap-1">
                  {c.rolesInBusiness.slice(0, 2).map((r) => (
                    <Badge key={r} variant="secondary">{r}</Badge>
                  ))}
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
