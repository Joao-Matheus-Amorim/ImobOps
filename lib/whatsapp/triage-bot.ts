// Inbound triage bot. Classifies a new message by intent using keywords/heuristics,
// creates a CRM lead when appropriate, and routes to an available broker.
import type { TriageClassification } from "@/lib/types/domain";
import type { RepoContext } from "@/lib/repositories/base";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { store } from "@/lib/mock-data";

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
function pickBroker(ctx: RepoContext): string | null {
  const brokers = store.users.filter((u) => u.tenancyId === ctx.tenancyId && u.role === "broker" && u.active);
  if (brokers.length === 0) return null;
  const leads = crmRepository.listLeads(ctx);
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

// Run triage for an inbound message. Creates a lead for sales/rental intents.
export function triageInbound(ctx: RepoContext, body: string): TriageResult {
  const classification = classifyMessage(body);
  const shouldCreateLead = classification === "locacao" || classification === "venda";
  if (!shouldCreateLead) {
    return { classification, leadId: null, assignedTo: null };
  }
  const assignedTo = pickBroker(ctx);
  const lead = crmRepository.createLead(ctx, {
    clientId: null,
    source: "whatsapp",
    interest: classification === "venda" ? "venda" : "locacao",
    assignedToUserId: assignedTo,
    funnelStage: "novo",
    lostReason: null,
  });
  return { classification, leadId: lead.id, assignedTo };
}
