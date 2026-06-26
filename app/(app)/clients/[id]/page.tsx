import { notFound } from "next/navigation";
import { Mail, Phone, MapPin, MessageCircle, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { BUSINESS_ROLE_LABELS } from "@/lib/types/domain";
import { NewChargeForm } from "@/components/domain/finance/new-charge-form";
import { NewClientDialog } from "@/components/domain/clients/new-client-dialog";
import { formatBrazilPhone, formatCpfCnpj } from "@/lib/utils";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("clients");
  const client = await clientsRepository.get(ctx, params.id);
  if (!client) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.name}
        description={client.kind === "pf" ? "Pessoa física" : "Pessoa jurídica"}
        action={
          <NewClientDialog
            client={client}
            trigger={
              <Button size="sm" variant="outline">
                <Pencil /> Editar
              </Button>
            }
          />
        }
      />

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar name={client.name} className="size-14 text-lg" />
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {client.rolesInBusiness.map((r) => (
                <Badge key={r}>{BUSINESS_ROLE_LABELS[r]}</Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {client.document ? formatCpfCnpj(client.document, client.kind) : "Documento não informado"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row icon={<Mail className="size-4" />} value={client.email} />
          <Row icon={<Phone className="size-4" />} value={client.phone ? formatBrazilPhone(client.phone) : null} />
          <Row icon={<MessageCircle className="size-4" />} value={client.whatsapp ? formatBrazilPhone(client.whatsapp) : null} />
          <Row icon={<MapPin className="size-4" />} value={client.address} />
        </CardContent>
      </Card>

      {client.tags.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {client.tags.map((t) => (
              <Badge key={t} variant="gold">{t}</Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <NewChargeForm fixedClientId={client.id} fixedClientName={client.name} />
    </div>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <span>{value ?? "—"}</span>
    </div>
  );
}
