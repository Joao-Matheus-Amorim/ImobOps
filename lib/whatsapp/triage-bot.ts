// Inbound triage bot. Classifies a new message by intent using keywords/heuristics,
// creates a CRM lead when appropriate, and routes to an available broker.
import type { TriageClassification } from "@/lib/types/domain";
import type { RepoContext } from "@/lib/repositories/base";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { usersRepository } from "@/lib/repositories/users.repository";
import { getLlmAdapter } from "@/lib/ai/provider";
import type { ChatMessage } from "@/lib/types/ai";

const KEYWORDS: Record<Exclude<TriageClassification, null | "outro">, string[]> = {
  locacao: ["alugar", "aluguel", "locação", "locacao", "alugo", "inquilino", "fiador"],
  venda: ["comprar", "compra", "venda", "vender", "financiamento", "à venda", "a venda"],
  condominio: ["condomínio", "condominio", "taxa", "síndico", "sindico", "assembleia", "boleto do condomínio"],
  financeiro: ["boleto", "pagamento", "comprovante", "2ª via", "segunda via", "pix", "fatura"],
};

// Classify a message body into an intent.
export function classifyMessage(body: string): TriageClassification {
  const text = body.toLowerCase();
  for (const [cls, words] of Object.entries(KEYWORDS) as [
    Exclude<TriageClassification, null | "outro">,
    string[],
  ][]) {
    if (words.some((w) => text.includes(w))) return cls;
  }
  return "outro";
}

// Pick the broker with the fewest assigned leads (round-robin-ish).
async function pickBroker(ctx: RepoContext): Promise<string | null> {
  const brokers = await usersRepository.listByRole(ctx, "broker");
  if (brokers.length === 0) return null;
  const leads = await crmRepository.listLeads(ctx);
  let best = brokers[0];
  let bestCount = Infinity;
  for (const b of brokers) {
    const count = leads.filter((l) => l.assignedToUserId === b.id).length;
    if (count < bestCount) {
      best = b;
      bestCount = count;
    }
  }
  return best.id;
}

export interface TriageResult {
  classification: TriageClassification;
  leadId: string | null;
  assignedTo: string | null;
}

const CLASSIFICATION_HINT: Record<NonNullable<TriageClassification>, string> = {
  locacao: "O lead tem interesse em LOCAÇÃO (alugar um imóvel).",
  venda: "O lead tem interesse em VENDA (comprar um imóvel).",
  condominio: "A mensagem é sobre CONDOMÍNIO (taxas, síndico, assembleia).",
  financeiro: "A mensagem é sobre FINANCEIRO (boleto, pagamento, 2ª via, PIX).",
  outro: "A intenção da mensagem não foi identificada.",
};

// Generate a contextual reply for an inbound WhatsApp message using the LLM
// adapter. Falls back to a safe canned message if the model fails or is in mock
// mode, so the bot always answers something coherent.
export async function generateReply(
  body: string,
  classification: TriageClassification,
): Promise<string> {
  const hint = CLASSIFICATION_HINT[classification ?? "outro"];
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "Você é o atendente virtual de uma imobiliária no WhatsApp. " +
        "Responda em português do Brasil, de forma curta (até 2 frases), cordial e objetiva. " +
        "Confirme o interesse do cliente e diga que um corretor dará sequência. " +
        "Não invente preços, endereços, datas ou disponibilidade. " +
        `Contexto da triagem: ${hint}`,
    },
    { role: "user", content: body },
  ];
  try {
    const adapter = getLlmAdapter();
    const res = await adapter.chat(messages, []);
    const text = res.content?.trim();
    if (text) return text;
  } catch {
    // fall through to canned reply
  }
  return "Recebemos sua mensagem! Um de nossos corretores vai te responder em breve. 🙂";
}

// Run triage for an inbound message. Creates a lead for sales/rental intents.
export async function triageInbound(ctx: RepoContext, body: string): Promise<TriageResult> {
  const classification = classifyMessage(body);
  const shouldCreateLead = classification === "locacao" || classification === "venda";
  if (!shouldCreateLead) {
    return { classification, leadId: null, assignedTo: null };
  }
  const assignedTo = await pickBroker(ctx);
  const lead = await crmRepository.createLead(ctx, {
    clientId: null,
    source: "whatsapp",
    interest: classification === "venda" ? "venda" : "locacao",
    assignedToUserId: assignedTo,
    funnelStage: "novo",
    lostReason: null,
  });
  return { classification, leadId: lead.id, assignedTo };
}
