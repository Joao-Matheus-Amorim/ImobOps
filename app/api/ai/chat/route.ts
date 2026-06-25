// AI chat endpoint. Streams the assistant reply and returns any proposed tool
// calls. Tool execution happens via /api/ai/tools/[tool] (dry-run + confirm),
// keeping this route side-effect free for the model turn itself.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { getLlmAdapter } from "@/lib/ai/provider";
import { ALL_TOOLS } from "@/lib/ai/tools/registry";
import { allowedToolsFor } from "@/lib/ai/guard";
import type { ChatMessage } from "@/lib/types/ai";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1),
});

const SYSTEM_PROMPT = `Você é o assistente operacional da imobiliária no ImobOps.
Ajude com clientes, imóveis, locação, vendas, condomínio, CRM, finanças e WhatsApp.
Use as ferramentas disponíveis. Ações de escrita exigem confirmação do usuário antes de executar.
Responda em português brasileiro, de forma objetiva.`;

export async function POST(request: Request) {
  const principal = await getPrincipal();
  const user = await getSessionUser();
  if (!principal || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const tools = allowedToolsFor(ALL_TOOLS, principal);
  const adapter = getLlmAdapter();

  const messages: ChatMessage[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\nUsuário: ${user.displayName} (${user.role}).` },
    ...parsed.data.messages,
  ];

  const response = await adapter.chat(messages, tools);

  // Attach previews for any proposed write tool calls so the UI can ask to confirm.
  const proposed = response.toolCalls.map((tc) => {
    const tool = tools.find((t) => t.name === tc.name);
    return {
      ...tc,
      effect: tool?.effect ?? "read",
      requiresConfirmation: tool?.effect === "write",
    };
  });

  return NextResponse.json({
    provider: adapter.name,
    content: response.content,
    toolCalls: proposed,
  });
}
