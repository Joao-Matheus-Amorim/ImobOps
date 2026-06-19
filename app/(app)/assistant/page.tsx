import { PageHeader } from "@/components/ui/page-header";
import { guardPage } from "@/lib/guard-page";
import { getPrincipal } from "@/lib/session";
import { AssistantChat } from "@/components/domain/assistant/assistant-chat";
import { ALL_TOOLS } from "@/lib/ai/tools/registry";
import { allowedToolsFor } from "@/lib/ai/guard";

export const metadata = { title: "Assistente IA" };

export default function AssistantPage() {
  guardPage("assistant");
  const principal = getPrincipal();
  const canUseTools = allowedToolsFor(ALL_TOOLS, principal).length > 0;

  return (
    <div className="space-y-4">
      <PageHeader badge="Inteligência Artificial" title="Assistente IA" description="Converse, consulte e execute ações com confirmação" />
      <AssistantChat canUseTools={canUseTools} />
    </div>
  );
}
