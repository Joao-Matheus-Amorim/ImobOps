import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { guardPage } from "@/lib/guard-page";
import { store } from "@/lib/mock-data";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions/rules";
import { ROLE_LABELS, ROLES, FEATURE_LABELS } from "@/lib/types/permissions";
import { aiActionsRepository } from "@/lib/repositories/audit.repository";
import { isSupabaseConfigured, aiProvider, isWhatsAppConfigured } from "@/lib/constants";

export const metadata = { title: "Administração" };

export default async function AdminPage() {
  const { ctx } = await guardPage("admin");
  const users = store.users.filter((u) => u.tenancyId === ctx.tenancyId);
  const aiActions = (await aiActionsRepository.list(ctx)).slice(0, 8);

  return (
    <div className="space-y-5">
      <PageHeader badge="Administração" title="Administração" description="Usuários, permissões e configurações" />

      <Card>
        <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <Integration label="Supabase" on={isSupabaseConfigured()} offText="Modo mock" />
          <Integration label={`IA (${aiProvider()})`} on={aiProvider() !== "mock"} offText="Mock" />
          <Integration label="WhatsApp" on={isWhatsAppConfigured()} offText="Mock" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usuários ({users.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
              <div className="flex items-center gap-3">
                <Avatar name={u.displayName} className="size-9" />
                <div>
                  <p className="text-sm font-medium">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <Badge variant={u.active ? "success" : "outline"}>{ROLE_LABELS[u.role]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Permissões padrão por papel</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ROLES.map((role) => (
            <div key={role}>
              <p className="font-medium">{ROLE_LABELS[role]}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {DEFAULT_PERMISSIONS[role].slice(0, 6).map((p) => (
                  <Badge key={p.feature} variant="secondary">
                    {FEATURE_LABELS[p.feature]} · {p.scope}
                  </Badge>
                ))}
                {DEFAULT_PERMISSIONS[role].length > 6 ? (
                  <Badge variant="outline">+{DEFAULT_PERMISSIONS[role].length - 6}</Badge>
                ) : null}
              </div>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Regra de ouro: o papel define o padrão, o admin define a permissão real, e a permissão sempre vence o papel.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ações recentes da IA</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {aiActions.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma ação de IA registrada ainda.</p>
          ) : (
            aiActions.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{a.toolName}</p>
                  <p className="text-xs text-muted-foreground">{a.dryRun ? "dry-run" : a.confirmed ? "executada" : "—"}</p>
                </div>
                <Badge variant={a.error ? "destructive" : "success"}>{a.error ? "erro" : "ok"}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Integration({ label, on, offText }: { label: string; on: boolean; offText: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3">
      <span>{label}</span>
      <Badge variant={on ? "success" : "warning"}>{on ? "Conectado" : offText}</Badge>
    </div>
  );
}
