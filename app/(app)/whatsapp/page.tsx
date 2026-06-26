import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { guardPage } from "@/lib/guard-page";
import { whatsappRepository } from "@/lib/repositories/whatsapp.repository";
import { isWhatsAppConfigured } from "@/lib/constants";
import { WhatsAppInbox } from "@/components/domain/whatsapp/whatsapp-inbox";
import { ConnectNumber } from "@/components/domain/whatsapp/connect-number";

export const metadata = { title: "WhatsApp" };

export default async function WhatsAppPage() {
  const { ctx } = await guardPage("whatsapp");
  const [conversations, byConversation] = await Promise.all([
    whatsappRepository.listConversations(ctx),
    whatsappRepository.messagesByConversation(ctx),
  ]);
  const initial = conversations.map((c) => ({
    ...c,
    messages: byConversation.get(c.id) ?? [],
  }));
  const configured = isWhatsAppConfigured();
  const templates = (await whatsappRepository.listTemplates(ctx, true)).map((t) => ({
    id: t.id,
    title: t.title,
    body: t.body,
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        badge="Inbox"
        title="Mensagens WhatsApp"
        description="Conecte um numero por QR Code e atenda as conversas do WhatsApp aqui dentro."
        action={configured ? <Badge>Evolution conectada</Badge> : <Badge variant="outline">Modo mock</Badge>}
      />

      <ConnectNumber initialConfigured={configured} />

      <Suspense fallback={null}>
        <WhatsAppInbox initial={initial} templates={templates} />
      </Suspense>
    </div>
  );
}
