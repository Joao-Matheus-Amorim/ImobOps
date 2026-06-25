import { Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { filterAllowed, getPrincipalCan } from "@/components/domain/_helpers";
import { NewClientDialog } from "@/components/domain/clients/new-client-dialog";
import { ClientsTable } from "@/components/domain/clients/clients-table";

export const metadata = { title: "Clientes" };

type ClientHealth = {
  openAmount: number;
  overdueAmount: number;
  nextDue: string;
  score: "saudavel" | "atencao" | "critico";
  paymentLabel: string;
};

export default async function ClientsPage() {
  const { ctx } = await guardPage("clients");
  const principal = await getPrincipalCan();
  const clients = filterAllowed(principal, "clients", await clientsRepository.list(ctx));
  const canCreate = Boolean(principal);

  // Fetch rentals once and group installments per contract, instead of refetching
  // the whole rentals list inside a per-client loop (was O(clients) duplicate queries).
  const allContracts = await rentalsRepository.list(ctx);
  const installmentsByContract = new Map(
    await Promise.all(
      allContracts.map(
        async (contract) =>
          [contract.id, await rentalsRepository.listInstallments(ctx, contract.id)] as const,
      ),
    ),
  );

  const health: Record<string, ClientHealth> = {};
  for (const c of clients) {
    const contracts = allContracts.filter(
      (r) => r.tenantClientId === c.id || r.landlordClientId === c.id,
    );
    const installments = contracts.flatMap((r) => installmentsByContract.get(r.id) ?? []);
    const open = installments.filter((i) => i.status === "a_vencer" || i.status === "atrasado");
    const overdue = installments.filter((i) => i.status === "atrasado");
    const next = open.find((i) => i.status === "a_vencer") ?? open[0];
    const overdueAmount = overdue.reduce((sum, i) => sum + i.amount, 0);
    const openAmount = open.reduce((sum, i) => sum + i.amount, 0);
    const score = overdueAmount > 0 ? "critico" : openAmount > 0 ? "atencao" : "saudavel";

    health[c.id] = {
      openAmount,
      overdueAmount,
      nextDue: next ? next.dueDate.slice(5).split("-").reverse().join("/") : "-",
      score,
      paymentLabel: contracts.length > 0 ? "Boleto / PIX" : "Sem ciclo ativo",
    };
  }

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Carteira"
        title="Clientes"
        description="Saude financeira, boletos, PIX e relacionamento por cliente."
        action={
          canCreate ? (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Upload /> POP Cliente Novo
              </Button>
              <NewClientDialog />
            </div>
          ) : undefined
        }
      />

      <ClientsTable clients={clients} health={health} />
    </div>
  );
}
