// AI chat endpoint. Streams the assistant reply and returns any proposed tool
// calls. Tool execution happens via /api/ai/tools/[tool] (dry-run + confirm),
// keeping this route side-effect free for the model turn itself.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrincipal, getSessionUser } from "@/lib/session";
import { getLlmAdapter } from "@/lib/ai/provider";
import { ALL_TOOLS } from "@/lib/ai/tools/registry";
import { allowedToolsFor, toolContextFor } from "@/lib/ai/guard";
import { runTool } from "@/lib/ai/confirm";
import {
  hashRequest,
  getCachedResponse,
  setCachedResponse,
  getCachedToolResult,
  setCachedToolResult,
  acquireLock,
  releaseLock,
  waitForCachedResponse,
} from "@/lib/ai/cache";
import { recordAiAction } from "@/lib/ai/audit";
import type { ChatMessage, ChatResponse } from "@/lib/types/ai";

// Max automatic read-tool round-trips before we stop (avoids loops / cost).
const MAX_READ_STEPS = 4;

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1),
});

const SYSTEM_PROMPT = `Você é o assistente operacional do ImobOps, um ERP imobiliário. Fala português do Brasil, de forma objetiva e cordial.

VOCÊ TEM FERRAMENTAS REAIS que executam ações no sistema. Use-as sempre que o usuário pedir uma ação ou uma consulta — não invente, não responda vazio. O que você consegue fazer:
- CLIENTES: buscar, ver, criar, atualizar, adicionar tags.
- IMÓVEIS: buscar, ver, cadastrar, atualizar, mudar status.
- LOCAÇÃO: criar contrato, gerar parcelas, listar parcelas, marcar parcela paga, anexar comprovante, calcular repasse ao proprietário, listar aluguéis em atraso.
- VENDAS: criar anúncio, registrar proposta, mover proposta, fechar contrato de venda, registrar pagamento de comissão.
- CONDOMÍNIO: cadastrar condomínio e unidades, gerar taxas, marcar taxa paga, lançar e ratear despesas.
- CRM: criar lead, atribuir, mover no funil, registrar atividade, agendar visita.
- FINANCEIRO/COBRANÇA: CRIAR boleto/PIX (create_charge), LISTAR/BUSCAR boletos já existentes (list_charges, por cliente/status) e ENVIAR a cobrança pelo WhatsApp (send_charge_whatsapp). Para enviar um boleto que JÁ existe: ache o cliente (search_clients), liste os boletos dele (list_charges), e envie o(s) certo(s) com send_charge_whatsapp.
- WHATSAPP: enviar mensagem, enviar template, buscar conversas.

COMO AGIR:
1. Se o pedido corresponde a uma ferramenta, CHAME a ferramenta com os dados certos. Para criar boleto: PRIMEIRO use search_clients com o NOME que o usuário deu (ele NÃO precisa fornecer CPF/e-mail — você busca pelo nome); depois create_charge com o clientId encontrado; se pedirem para enviar, use send_charge_whatsapp. Se o usuário citou vários clientes, busque cada um.
2. Só pergunte dados que você realmente não tem como obter sozinho e que são obrigatórios (ex.: o VALOR de um boleto). Não peça identificação de cliente se o usuário já deu um nome — busque. Se a busca não encontrar ou houver ambiguidade (vários com o mesmo nome), aí sim peça para esclarecer.
3. Datas: resolva "amanhã/hoje/dia X" para yyyy-mm-dd usando a data de hoje fornecida. NUNCA escreva código, fórmulas, chamadas tipo new Date(...) ou templates com chaves duplas na resposta — escreva apenas a data já calculada.
4. Se o usuário pedir algo que NÃO está nas suas ferramentas (ex.: gerar relatório em PDF, alterar configurações do sistema, algo de outra área), diga com clareza que essa ação ainda não está disponível no assistente e sugira o caminho manual na interface — não finja que fez.
5. Toda ação de ESCRITA (criar, atualizar, enviar, marcar pago, etc.) é confirmada pelo usuário antes de executar — explique brevemente o que vai fazer; o sistema mostrará a prévia e pedirá confirmação.
6. Consultas (buscar, listar, ver) podem ser respondidas direto.
Nunca responda "sem assunto" ou em branco: ou age, ou pergunta o que falta, ou explica por que não pode.`;

function buildMessages(user: { displayName: string; role: string }, parsedMessages: z.infer<typeof bodySchema>["messages"]): ChatMessage[] {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const tomorrowISO = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);
  const dateContext = `Hoje é ${todayISO} (amanhã é ${tomorrowISO}). Resolva datas relativas para o formato yyyy-mm-dd; nunca devolva fórmulas ou código.`;
  return [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n${dateContext}\nUsuário: ${user.displayName} (${user.role}).`,
    },
    ...parsedMessages,
  ];
}

async function runAgentLoop(adapter: ReturnType<typeof getLlmAdapter>, messages: ChatMessage[], tools: ReturnType<typeof allowedToolsFor>, toolCtx: ReturnType<typeof toolContextFor>, originalPrompt: string) {
  const reqHash = hashRequest(messages, tools.map((t) => t.name), toolCtx.tenancyId);

  const callModel = async () => {
    try {
      return await adapter.chat(messages, tools);
    } catch (err) {
      const message = (err as Error).message ?? "Falha ao consultar a IA.";
      const credits = /402|insufficient credits|payment/i.test(message);
      const rate = /429|rate limit/i.test(message);
      throw new Error(
        credits
          ? "Provedor de IA sem créditos. Adicione créditos ou use um modelo gratuito (OPENROUTER_MODEL)."
          : rate
            ? "Provedor de IA com limite de uso atingido. Tente em instantes."
            : `Falha na IA: ${message}`,
      );
    }
  };

  let lockAcquired = false;
  const firstCall = async () => {
    const cached = await getCachedResponse(reqHash);
    if (cached) return cached;
    lockAcquired = await acquireLock(reqHash);
    if (!lockAcquired) {
      const waited = await waitForCachedResponse(reqHash);
      if (waited) return waited;
    }
    return callModel();
  };

  let response: ChatResponse;
  try {
    response = await firstCall();
    for (let step = 0; step < MAX_READ_STEPS; step++) {
      const reads = response!.toolCalls.filter(
        (tc) => tools.find((t) => t.name === tc.name)?.effect === "read",
      );
      const hasWrite = response!.toolCalls.some(
        (tc) => tools.find((t) => t.name === tc.name)?.effect === "write",
      );
      if (reads.length === 0 || hasWrite) break;

      messages.push({ role: "assistant", content: response!.content ?? "", toolCalls: response!.toolCalls });
      for (const tc of reads) {
        const tool = tools.find((t) => t.name === tc.name);
        if (!tool) continue;
        const cachedResult = await getCachedToolResult(tool.name, tc.params, toolCtx.tenancyId);
        const result = cachedResult !== null
          ? { callId: tc.id, toolName: tool.name, dryRun: false, confirmed: true, ok: true, data: cachedResult }
          : await runTool(tool, tc.params, toolCtx, { confirm: true }, tc.id);
        recordAiAction(toolCtx, originalPrompt, tool.name, tc.params, result);
        if (result.ok && result.data && cachedResult === null) {
          await setCachedToolResult(tool.name, tc.params, result.data, toolCtx.tenancyId).catch(() => {});
        }
        messages.push({
          role: "tool",
          content: JSON.stringify(result.ok ? (result.data ?? null) : { error: result.error }),
          toolCallId: tc.id,
        });
      }
      response = await callModel();
    }
  } catch (err) {
    if (lockAcquired) await releaseLock(reqHash).catch(() => {});
    throw err;
  }

  await setCachedResponse(reqHash, { content: response!.content, toolCalls: response!.toolCalls }).catch(() => {});
  if (lockAcquired) await releaseLock(reqHash).catch(() => {});

  return response!;
}

async function* streamAgentLoop(adapter: ReturnType<typeof getLlmAdapter>, messages: ChatMessage[], tools: ReturnType<typeof allowedToolsFor>, toolCtx: ReturnType<typeof toolContextFor>, originalPrompt: string) {
  const reqHash = hashRequest(messages, tools.map((t) => t.name), toolCtx.tenancyId);

  const callModelStream = async function* () {
    for await (const chunk of adapter.chatStream(messages, tools)) {
      yield chunk;
    }
  };

  let lockAcquired = false;
  try {
    const cached = await getCachedResponse(reqHash);
    if (cached) {
      yield { type: "done" as const, provider: adapter.name, content: cached.content, toolCalls: cached.toolCalls };
      return;
    }

    lockAcquired = await acquireLock(reqHash);
    if (!lockAcquired) {
      const waited = await waitForCachedResponse(reqHash);
      if (waited) {
        yield { type: "done" as const, provider: adapter.name, content: waited.content, toolCalls: waited.toolCalls };
        return;
      }
    }

    // First model call — stream tokens
    let response: ChatResponse | null = null;
    for await (const chunk of callModelStream()) {
      if (!chunk.done && chunk.delta) {
        yield { type: "delta" as const, delta: chunk.delta };
      } else if (chunk.done && chunk.response) {
        response = chunk.response;
      }
    }

    if (!response) {
      yield { type: "error" as const, error: "Modelo não retornou resposta." };
      return;
    }

    // Agent loop for read tools
    for (let step = 0; step < MAX_READ_STEPS; step++) {
      const r = response!;
      const reads = r.toolCalls.filter(
        (tc) => tools.find((t) => t.name === tc.name)?.effect === "read",
      );
      const hasWrite = r.toolCalls.some(
        (tc) => tools.find((t) => t.name === tc.name)?.effect === "write",
      );
      if (reads.length === 0 || hasWrite) break;

      yield { type: "thinking" as const, step: step + 1 };

      // Execute read tools
      messages.push({ role: "assistant", content: r.content ?? "", toolCalls: r.toolCalls });
      for (const tc of reads) {
        const tool = tools.find((t) => t.name === tc.name);
        if (!tool) continue;
        const cachedResult = await getCachedToolResult(tool.name, tc.params, toolCtx.tenancyId);
        const result = cachedResult !== null
          ? { callId: tc.id, toolName: tool.name, dryRun: false, confirmed: true, ok: true, data: cachedResult }
          : await runTool(tool, tc.params, toolCtx, { confirm: true }, tc.id);
        recordAiAction(toolCtx, originalPrompt, tool.name, tc.params, result);
        if (result.ok && result.data && cachedResult === null) {
          await setCachedToolResult(tool.name, tc.params, result.data, toolCtx.tenancyId).catch(() => {});
        }
        messages.push({
          role: "tool",
          content: JSON.stringify(result.ok ? (result.data ?? null) : { error: result.error }),
          toolCallId: tc.id,
        });
      }

      // Next call — stream tokens
      response = null;
      for await (const chunk of callModelStream()) {
        if (!chunk.done && chunk.delta) {
          yield { type: "delta" as const, delta: chunk.delta };
        } else if (chunk.done && chunk.response) {
          response = chunk.response;
        }
      }
    }

    if (!response) {
      yield { type: "error" as const, error: "Modelo não retornou resposta após processamento." };
      return;
    }

    await setCachedResponse(reqHash, { content: response.content, toolCalls: response.toolCalls }).catch(() => {});
    if (lockAcquired) await releaseLock(reqHash).catch(() => {});

    // Final event with proposed write tools
    const writeCalls = response.toolCalls.filter(
      (tc) => tools.find((t) => t.name === tc.name)?.effect === "write",
    );
    const proposed = writeCalls.map((tc) => ({
      ...tc,
      effect: "write" as const,
      requiresConfirmation: true,
    }));

    yield {
      type: "done" as const,
      provider: adapter.name,
      content: response.content,
      toolCalls: proposed,
    };
  } catch (err) {
    if (lockAcquired) await releaseLock(reqHash).catch(() => {});
    yield { type: "error" as const, error: (err as Error).message };
  }
}

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
  const messages = buildMessages(user, parsed.data.messages);
  const toolCtx = toolContextFor(principal, user.tenancyId);
  const originalPrompt = parsed.data.messages[0]?.content ?? "";

  const wantsStream = request.headers.get("accept") === "text/event-stream" || new URL(request.url).searchParams.has("stream");

  if (wantsStream) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamAgentLoop(adapter, messages, tools, toolCtx, originalPrompt)) {
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
          }
        } catch (err) {
          const data = JSON.stringify({ error: (err as Error).message });
          controller.enqueue(encoder.encode(`event: error\ndata: ${data}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  }

  // Non-streaming path (backward compatible)
  let response;
  try {
    response = await runAgentLoop(adapter, messages, tools, toolCtx, originalPrompt);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const writeCalls = response.toolCalls.filter(
    (tc) => tools.find((t) => t.name === tc.name)?.effect === "write",
  );
  const proposed = writeCalls.map((tc) => ({
    ...tc,
    effect: "write" as const,
    requiresConfirmation: true,
  }));

  return NextResponse.json({
    provider: adapter.name,
    content: response.content,
    toolCalls: proposed,
  });
}