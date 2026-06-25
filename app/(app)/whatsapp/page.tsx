import {
  MessageCircle,
  QrCode,
  RefreshCw,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { guardPage } from "@/lib/guard-page";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { isWhatsAppConfigured } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "WhatsApp" };

function displayName(phone: string, index: number) {
  const names = ["Maria Eduarda", "Suporte ImobOps", "Suporte DL", "Financeiro"];
  return names[index] ?? phone;
}

export default function WhatsAppPage() {
  const { ctx } = guardPage("whatsapp");
  const conversations = whatsappRepository.listConversations(ctx);
  const configured = isWhatsAppConfigured();

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Inbox"
        title="Mensagens WhatsApp"
        description="Conecte um numero por QR Code e atenda as conversas do WhatsApp aqui dentro."
        action={configured ? <Badge>Evolution conectada</Badge> : <Badge variant="outline">Modo mock</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-5 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          <p className="section-label text-primary/80">Conectar WhatsApp (QR Code)</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Conecte o numero da empresa ou o seu escaneando o QR, igual ao WhatsApp Web.
          </p>
          <div className="mt-5 flex items-center gap-4">
            <div className="grid size-[76px] place-items-center rounded-2xl border border-dashed border-primary/45 bg-primary/8 text-primary shadow-glow-sm">
              <QrCode className="size-9" />
            </div>
            <Button>
              <QrCode /> Conectar numero
            </Button>
          </div>
        </Card>

        <Card className="rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-5 shadow-[0_34px_110px_-72px_hsl(var(--primary)/0.9)]">
          <p className="section-label text-primary/80">Numeros conectados</p>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/14 bg-background/25 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl border border-primary/30 bg-primary/12 text-primary shadow-glow-sm">
                <UserRound className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Suporte</p>
                <p className="text-xs text-muted-foreground">
                  {configured ? "Conectado" : "Mock"} | +55 21 99999-0000
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge>on</Badge>
              <button className="text-muted-foreground transition hover:text-primary" type="button">
                <RefreshCw className="size-4" />
              </button>
              <button className="text-muted-foreground transition hover:text-primary" type="button">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          <Button variant="outline" className="mt-3 w-full">
            <QrCode /> Conectar numero
          </Button>
        </Card>
      </div>

      {conversations.length === 0 ? (
        <EmptyState title="Sem conversas" icon={<MessageCircle className="size-8" />} />
      ) : (
        <div className="grid min-h-[620px] gap-4 lg:grid-cols-[214px_minmax(0,1fr)] xl:grid-cols-[214px_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-0">
            <div className="max-h-[620px] space-y-2 overflow-y-auto p-3 thin-scrollbar">
              {conversations.map((conversation, index) => {
                const messages = whatsappRepository.listMessages(ctx, conversation.id);
                const last = messages.at(-1);
                const unread = index === 0 ? 2 : index === 1 ? 1 : 0;

                return (
                  <div
                    key={conversation.id}
                    className="flex gap-3 rounded-2xl border border-primary/12 bg-background/22 p-3 transition hover:border-primary/35 hover:bg-primary/8"
                  >
                    <Avatar name={displayName(conversation.phone, index)} className="size-9 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {displayName(conversation.phone, index)}
                        </p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatDate(last?.sentAt ?? conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {last?.body ?? conversation.phone}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusBadge status={conversation.status} />
                        {unread ? <Badge>{unread}</Badge> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="flex min-h-[620px] items-center justify-center rounded-[1.35rem] border-primary/18 bg-[#102f4d]/82 p-8">
            <div className="w-full max-w-sm rounded-[1.35rem] border border-dashed border-primary/25 bg-background/16 p-8 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-glow">
                <MessageCircle className="size-8" />
              </div>
              <p className="mt-6 section-label text-primary/80">Selecione uma conversa</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Selecione uma conversa para ver as mensagens e responder.
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
