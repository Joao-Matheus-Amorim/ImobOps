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

const SYSTEM_PROMPT = `Você é o assistente operacional do ImobOps, um ERP imobiliário. Fala português do Brasil, de forma objetiva e cordial.

VOCÊ TEM FERRAMENTAS REAIS que executam ações no sistema. Use-as sempre que o usuário pedir uma ação ou uma consulta — não invente, não responda vazio. O que você consegue fazer:
- CLIENTES: buscar, ver, criar, atualizar, adicionar tags.
- IMÓVEIS: buscar, ver, cadastrar, atualizar, mudar status.
- LOCAÇÃO: criar contrato, gerar parcelas, listar parcelas, marcar parcela paga, anexar comprovante, calcular repasse ao proprietário, listar aluguéis em atraso.
- VENDAS: criar anúncio, registrar proposta, mover proposta, fechar contrato de venda, registrar pagamento de comissão.
- CONDOMÍNIO: cadastrar condomínio e unidades, gerar taxas, marcar taxa paga, lançar e ratear despesas.
- CRM: criar lead, atribuir, mover no funil, registrar atividade, agendar visita.
- FINANCEIRO/COBRANÇA: CRIAR BOLETO/PIX para um cliente (create_charge) e ENVIAR a cobrança pelo WhatsApp (send_charge_whatsapp).
- WHATSAPP: enviar mensagem, enviar template, buscar conversas.

COMO AGIR:
1. Se o pedido corresponde a uma ferramenta, CHAME a ferramenta com os dados certos. Para criar boleto: PRIMEIRO use search_clients com o NOME que o usuário deu (ele NÃO precisa fornecer CPF/e-mail — você busca pelo nome); depois create_charge com o clientId encontrado; se pedirem para enviar, use send_charge_whatsapp. Se o usuário citou vários clientes, busque cada um.
2. Só pergunte dados que você realmente não tem como obter sozinho e que são obrigatórios (ex.: o VALOR de um boleto). Não peça identificação de cliente se o usuário já deu um nome — busque. Se a busca não encontrar ou houver ambiguidade (vários com o mesmo nome), aí sim peça para esclarecer.
3. Datas: resolva "amanhã/hoje/dia X" para yyyy-mm-dd usando a data de hoje fornecida. NUNCA escreva código, fórmulas, chamadas tipo new Date(...) ou templates com chaves duplas na resposta — escreva apenas a data já calculada.
4. Se o usuário pedir algo que NÃO está nas suas ferramentas (ex.: gerar relatório em PDF, alterar configurações do sistema, algo de outra área), diga com clareza que essa ação ainda não está disponível no assistente e sugira o caminho manual na interface — não finja que fez.
5. Toda ação de ESCRITA (criar, atualizar, enviar, marcar pago, etc.) é confirmada pelo usuário antes de executar — explique brevemente o que vai fazer; o sistema mostrará a prévia e pedirá confirmação.
6. Consultas (buscar, listar, ver) podem ser respondidas direto.
Nunca responda "sem assunto" ou em branco: ou age, ou pergunta o que falta, ou explica por que não pode.`;

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

  // Models have no clock — give them today's date so they can resolve "amanhã",
  // "hoje", "semana que vem" into real yyyy-mm-dd values.
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const tomorrowISO = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10);
  const dateContext = `Hoje é ${todayISO} (amanhã é ${tomorrowISO}). Resolva datas relativas para o formato yyyy-mm-dd; nunca devolva fórmulas ou código.`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n${dateContext}\nUsuário: ${user.displayName} (${user.role}).`,
    },
    ...parsed.data.messages,
  ];

  let response;
  try {
    response = await adapter.chat(messages, tools);
  } catch (err) {
    // Surface the real reason (e.g. provider out of credits / rate limited)
    // instead of a generic failure, so it's diagnosable from the UI.
    const message = (err as Error).message ?? "Falha ao consultar a IA.";
    const credits = /402|insufficient credits|payment/i.test(message);
    const rate = /429|rate limit/i.test(message);
    return NextResponse.json(
      {
        error: credits
          ? "Provedor de IA sem créditos. Adicione créditos ou use um modelo gratuito (OPENROUTER_MODEL)."
          : rate
            ? "Provedor de IA com limite de uso atingido. Tente em instantes."
            : `Falha na IA: ${message}`,
      },
      { status: 502 },
    );
  }

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
