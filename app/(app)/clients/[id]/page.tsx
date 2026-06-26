import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Pencil,
  Building2,
  KeyRound,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { guardPage } from "@/lib/guard-page";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { BUSINESS_ROLE_LABELS, FUNNEL_STAGE_LABELS } from "@/lib/types/domain";
import { NewChargeForm } from "@/components/domain/finance/new-charge-form";
import { NewClientDialog } from "@/components/domain/clients/new-client-dialog";
import { formatBrazilPhone, formatCpfCnpj, formatBRL } from "@/lib/utils";
import { routes } from "@/lib/routes";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const { ctx } = await guardPage("clients");
  const client = await clientsRepository.get(ctx, params.id);
  if (!client) notFound();

  // Pull the client's relationships across the business.
  const [properties, rentals, leads] = await Promise.all([
    propertiesRepository.list(ctx),
    rentalsRepository.list(ctx),
    crmRepository.listLeads(ctx),
  ]);
  const ownedProperties = properties.filter((p) => p.ownerClientId === client.id);
  const clientRentals = rentals.filter(
    (r) => r.tenantClientId === client.id || r.landlordClientId === client.id,
  );
  const activeRentals = clientRentals.filter((r) => r.status === "ativo");
  const clientLeads = leads.filter((l) => l.clientId === client.id);

  const stats = [
    { label: "Imóveis", value: ownedProperties.length, icon: Building2 },
    { label: "Contratos ativos", value: activeRentals.length, icon: KeyRound },
    { label: "Leads", value: clientLeads.length, icon: Target },
  ];

  return (
    <div className="space-y-5">
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

      {/* Hero: identity + key counts */}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} className="size-16 text-xl" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap gap-1">
                {client.rolesInBusiness.length > 0 ? (
                  client.rolesInBusiness.map((r) => (
                    <Badge key={r}>{BUSINESS_ROLE_LABELS[r]}</Badge>
                  ))
                ) : (
                  <Badge variant="outline">Sem papel definido</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {client.document
                  ? formatCpfCnpj(client.document, client.kind)
                  : "Documento não informado"}
              </p>
            </div>
          </div>

          {/* Contact as actionable rows */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <ContactAction icon={<Phone className="size-4" />} label="Telefone" value={client.phone ? formatBrazilPhone(client.phone) : null} href={client.phone ? `tel:${client.phone}` : undefined} />
            <ContactAction icon={<MessageCircle className="size-4" />} label="WhatsApp" value={client.whatsapp ? formatBrazilPhone(client.whatsapp) : null} href={client.whatsapp ? `https://wa.me/55${client.whatsapp.replace(/\D/g, "")}` : undefined} />
            <ContactAction icon={<Mail className="size-4" />} label="E-mail" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
            <ContactAction icon={<MapPin className="size-4" />} label="Endereço" value={client.address} />
          </div>

          {client.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-primary/10 pt-4">
              {client.tags.map((t) => (
                <Badge key={t} variant="gold">{t}</Badge>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-6">
          <p className="section-label text-primary/80">Relacionamento</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-primary/12 bg-background/30 p-3 text-center">
                <Icon className="mx-auto size-5 text-primary" />
                <p className="mt-2 font-display text-2xl font-semibold text-foreground">{value}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Linked entities */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Imóveis</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ownedProperties.length === 0 ? (
              <EmptyState title="Nenhum imóvel vinculado" icon={<Building2 className="size-7" />} />
            ) : (
              ownedProperties.map((p) => (
                <LinkRow key={p.id} href={routes.property(p.id)} title={p.address} subtitle={p.kind} trailing={<StatusBadge status={p.status} />} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Contratos de locação</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {clientRentals.length === 0 ? (
              <EmptyState title="Nenhum contrato" icon={<KeyRound className="size-7" />} />
            ) : (
              clientRentals.map((r) => (
                <LinkRow
                  key={r.id}
                  href={routes.rental(r.id)}
                  title={formatBRL(r.monthlyValue) + "/mês"}
                  subtitle={r.tenantClientId === client.id ? "como locatário" : "como locador"}
                  trailing={<StatusBadge status={r.status} />}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {clientLeads.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Leads no funil</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {clientLeads.map((l) => (
              <LinkRow
                key={l.id}
                href={routes.crm}
                title={`${l.interest} · via ${l.source}`}
                subtitle={FUNNEL_STAGE_LABELS[l.funnelStage]}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <NewChargeForm fixedClientId={client.id} fixedClientName={client.name} />
    </div>
  );
}

function ContactAction({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/10 bg-background/25 px-3 py-2 transition hover:border-primary/35 hover:bg-primary/8">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
  return href && value ? (
    <Link href={href} target={href.startsWith("http") ? "_blank" : undefined}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function LinkRow({
  href,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5 transition hover:border-primary/35 hover:bg-primary/8"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        <ArrowUpRight className="size-4 text-primary opacity-0 transition group-hover:opacity-100" />
      </div>
    </Link>
  );
}
