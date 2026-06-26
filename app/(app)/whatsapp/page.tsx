import { QrCode, RefreshCw, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { guardPage } from "@/lib/guard-page";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { isWhatsAppConfigured } from "@/lib/constants";
import { WhatsAppInbox } from "@/components/domain/whatsapp/whatsapp-inbox";

export const metadata = { title: "WhatsApp" };

export default async function WhatsAppPage() {
  const { ctx } = await guardPage("whatsapp");
  const conversations = await whatsappRepository.listConversations(ctx);
  const initial = await Promise.all(
    conversations.map(async (c) => ({
      ...c,
      messages: await whatsappRepository.listMessages(ctx, c.id),
    })),
  );
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

      <WhatsAppInbox initial={initial} />
    </div>
  );
}
