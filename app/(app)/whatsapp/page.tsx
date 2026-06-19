import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { guardPage } from "@/lib/guard-page";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { isWhatsAppConfigured } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "WhatsApp" };

export default function WhatsAppPage() {
  const { ctx } = guardPage("whatsapp");
  const conversations = whatsappRepository.listConversations(ctx);
  const configured = isWhatsAppConfigured();

  return (
    <div className="space-y-4">
      <PageHeader
        badge="Inbox"
        title="WhatsApp"
        description={`${conversations.length} conversas`}
        action={configured ? <Badge variant="success">Evolution conectada</Badge> : <Badge variant="warning">Modo mock</Badge>}
      />
      {conversations.length === 0 ? (
        <EmptyState title="Sem conversas" icon={<MessageCircle className="size-8" />} />
      ) : (
        <div className="space-y-3">
          {conversations.map((c) => {
            const messages = whatsappRepository.listMessages(ctx, c.id);
            const last = messages.at(-1);
            return (
              <Card key={c.id}>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">{c.phone}</CardTitle>
                  <div className="flex items-center gap-2">
                    {c.triageClassification ? <Badge variant="secondary">{c.triageClassification}</Badge> : null}
                    <StatusBadge status={c.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {messages.slice(-3).map((m) => (
                    <div key={m.id} className={m.direction === "in" ? "text-foreground" : "text-muted-foreground"}>
                      <span className="font-medium">{m.direction === "in" ? "Cliente" : "Nós"}:</span> {m.body}
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">Última: {formatDate(last?.sentAt ?? c.lastMessageAt)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
