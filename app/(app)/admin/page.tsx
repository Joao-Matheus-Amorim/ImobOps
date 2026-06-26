import type { ReactNode } from "react";
import {
  CheckCircle2,
  Database,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { guardPage } from "@/lib/guard-page";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions/rules";
import { ROLE_LABELS, ROLES, FEATURE_LABELS } from "@/lib/types/permissions";
import { aiActionsRepository } from "@/lib/repositories/audit.repository";
import { usersRepository } from "@/lib/repositories/users.repository";
import { NewUserDialog } from "@/components/domain/admin/new-user-dialog";
import { aiProvider, isSupabaseConfigured, isWhatsAppConfigured } from "@/lib/constants";
import { getRuntimeSummary } from "@/lib/runtime-status";

export const metadata = { title: "Administracao" };

export default async function AdminPage() {
  const { ctx } = await guardPage("admin");
  const users = await usersRepository.list(ctx);
  const aiActions = (await aiActionsRepository.list(ctx)).slice(0, 8);
  const runtime = getRuntimeSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Administracao"
        title="Administracao"
        description="Usuarios, permissoes, integracoes e readiness da operacao."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStat
          label="Readiness"
          value={`${runtime.readyCount}/${runtime.totalCount}`}
          helper={runtime.appReady ? "stack pronta" : "faltam configuracoes"}
          icon={<CheckCircle2 className="size-5" />}
        />
        <AdminStat
          label="Usuarios"
          value={String(users.length)}
          helper={`${users.filter((user) => user.active).length} ativos`}
          icon={<ShieldCheck className="size-5" />}
        />
        <AdminStat
          label="IA"
          value={aiProvider()}
          helper={aiActions.length ? `${aiActions.length} acoes recentes` : "sem execucoes ainda"}
          icon={<Sparkles className="size-5" />}
        />
        <AdminStat
          label="Canais"
          value={isWhatsAppConfigured() ? "online" : "pendente"}
          helper={isSupabaseConfigured() ? "db real" : "mock store"}
          icon={<MessageCircleMore className="size-5" />}
        />
      </div>

      <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82">
        <CardHeader>
          <CardTitle>Checklist de readiness</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {runtime.checks.map((check) => (
            <div key={check.key} className="rounded-2xl border border-primary/12 bg-background/18 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
                    {runtimeIcon(check.key)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{check.label}</p>
                    <p className="text-xs text-muted-foreground">{check.detail}</p>
                  </div>
                </div>
                <Badge variant={check.ready ? "success" : "warning"}>
                  {check.ready ? "Pronto" : "Pendente"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {check.requiredVars.map((envName) => (
                  <Badge key={envName} variant="secondary">
                    {envName}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integracoes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <Integration label="Supabase" on={isSupabaseConfigured()} offText="Modo mock" />
          <Integration label={`IA (${aiProvider()})`} on={aiProvider() !== "mock"} offText="Fallback local" />
          <Integration label="WhatsApp" on={isWhatsAppConfigured()} offText="Pendente" />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Usuarios ({users.length})</CardTitle>
            <NewUserDialog />
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar name={user.displayName} className="size-9" />
                  <div>
                    <p className="text-sm font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Badge variant={user.active ? "success" : "outline"}>{ROLE_LABELS[user.role]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissoes padrao por papel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {ROLES.map((role) => (
              <div key={role}>
                <p className="font-medium">{ROLE_LABELS[role]}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {DEFAULT_PERMISSIONS[role].slice(0, 6).map((permission) => (
                    <Badge key={permission.feature} variant="secondary">
                      {FEATURE_LABELS[permission.feature]} - {permission.scope}
                    </Badge>
                  ))}
                  {DEFAULT_PERMISSIONS[role].length > 6 ? (
                    <Badge variant="outline">+{DEFAULT_PERMISSIONS[role].length - 6}</Badge>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Regra de ouro: o papel define o padrao, o admin define a permissao real, e a permissao sempre vence o papel.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acoes recentes da IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {aiActions.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma acao de IA registrada ainda.</p>
          ) : (
            aiActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{action.toolName}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.dryRun ? "dry-run" : action.confirmed ? "executada" : "-"}
                  </p>
                </div>
                <Badge variant={action.error ? "destructive" : "success"}>
                  {action.error ? "erro" : "ok"}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminStat({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <Card className="rounded-[1.35rem] border-primary/18 bg-card/55 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label text-primary/80">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function Integration({ label, on, offText }: { label: string; on: boolean; offText: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background/18 p-3">
      <span>{label}</span>
      <Badge variant={on ? "success" : "warning"}>{on ? "Conectado" : offText}</Badge>
    </div>
  );
}

function runtimeIcon(key: string) {
  if (key === "supabase") return <Database className="size-4" />;
  if (key === "whatsapp") return <MessageCircleMore className="size-4" />;
  if (key === "ai") return <Sparkles className="size-4" />;
  if (key === "billing") return <Wallet className="size-4" />;
  return <ShieldCheck className="size-4" />;
}
