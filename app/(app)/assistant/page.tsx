import { PageHeader } from "@/components/ui/page-header";
import { guardPage } from "@/lib/guard-page";
import { AssistantChat } from "@/components/domain/assistant/assistant-chat";
import { ALL_TOOLS } from "@/lib/ai/tools/registry";
import { allowedToolsFor } from "@/lib/ai/guard";

export const metadata = { title: "Assistente IA" };

export default async function AssistantPage() {
  const { user } = await guardPage("assistant");
  const principal = { id: user.id, role: user.role, teamMemberIds: user.teamMemberIds };
  const canUseTools = allowedToolsFor(ALL_TOOLS, principal).length > 0;

  return (
    <div className="space-y-4">
      <PageHeader badge="Inteligência Artificial" title="Assistente IA" description="Converse, consulte e execute ações com confirmação" />
      <AssistantChat canUseTools={canUseTools} />
    </div>
  );
}
