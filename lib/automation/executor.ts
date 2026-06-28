import { z } from "zod";
import type { RepoContext } from "@/lib/repositories/base";
import type { AutomationActionConfig, AutomationActionKind } from "@/lib/types/domain";
import { clientsRepository } from "@/lib/repositories/clients.repository";
import { propertiesRepository } from "@/lib/repositories/properties.repository";
import { rentalsRepository } from "@/lib/repositories/rentals.repository";
import { billingRepository } from "@/lib/repositories/billing.repository";
import { crmRepository } from "@/lib/repositories/crm.repository";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { condosRepository } from "@/lib/repositories/condos.repository";

const nullableString = z.string().nullable().default(null);
const id = z.string().min(1);
const fullName = z.string().trim().refine((value) => value.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome.");

const clientCreate = z.object({
  kind: z.enum(["pf", "pj"]).default("pf"),
  name: fullName,
  document: nullableString,
  email: nullableString,
  phone: z.string().trim().min(1, "Informe o telefone."),
  whatsapp: nullableString,
  address: nullableString,
  tags: z.array(z.string()).default([]),
  rolesInBusiness: z.array(z.enum(["locador", "locatario", "fiador", "comprador", "vendedor", "lead", "proprietario_condomino"])).default(["lead"]),
  ownerUserId: nullableString,
});
const clientPatch = clientCreate.partial();

const propertyCreate = z.object({
  kind: z.enum(["apartamento", "casa", "comercial", "terreno", "sala"]),
  address: z.string().min(1),
  areaM2: z.coerce.number().nullable().default(null),
  bedrooms: z.coerce.number().nullable().default(null),
  bathrooms: z.coerce.number().nullable().default(null),
  parkingSpots: z.coerce.number().nullable().default(null),
  ownerClientId: nullableString,
  status: z.enum(["disponivel", "alugado", "vendido", "em_obra", "inativo"]).default("disponivel"),
  availability: z.enum(["locacao", "venda", "ambos", "condominio_only"]).default("ambos"),
  condoId: nullableString,
  photos: z.array(z.string()).default([]),
  description: nullableString,
  ownerUserId: nullableString,
});
const propertyPatch = propertyCreate.partial();

const rentalCreate = z.object({
  propertyId: id,
  landlordClientId: id,
  tenantClientId: id,
  guarantorClientId: nullableString,
  monthlyValue: z.coerce.number().positive(),
  dueDay: z.coerce.number().int().min(1).max(28),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  durationMonths: z.coerce.number().int().positive(),
  indexType: z.enum(["igpm", "ipca", "none"]).default("ipca"),
  adminFeePct: z.coerce.number().min(0).default(10),
  lateFeePct: z.coerce.number().min(0).default(2),
  lateInterestPctMonth: z.coerce.number().min(0).default(1),
  status: z.enum(["ativo", "encerrado", "inadimplente", "em_renovacao"]).default("ativo"),
});
const rentalPatch = rentalCreate.partial();

const chargeStandalone = z.object({ clientId: id, amount: z.coerce.number().positive(), dueDate: z.string().min(10), method: z.enum(["boleto", "pix", "cartao"]).default("boleto"), description: z.string().optional() });
const chargeForSource = z.object({ sourceId: id, method: z.enum(["boleto", "pix", "cartao"]).default("boleto") });
const chargePatch = z.object({ description: nullableString, customerName: nullableString, method: z.enum(["boleto", "pix", "cartao"]).optional(), amount: z.coerce.number().positive().optional(), dueDate: z.string().min(10).optional(), status: z.enum(["pendente", "paga", "vencida", "cancelada", "falha"]).optional() });

const leadCreate = z.object({ clientId: nullableString, source: z.enum(["whatsapp", "site", "indicacao", "outros"]).default("outros"), interest: z.enum(["locacao", "venda", "condominio", "outro"]).default("outro"), assignedToUserId: nullableString, funnelStage: z.enum(["novo", "qualificado", "visita_agendada", "proposta", "fechado_ganho", "fechado_perdido"]).default("novo"), lostReason: nullableString });
const leadPatch = leadCreate.partial();
const activityCreate = z.object({ leadId: id, kind: z.enum(["ligacao", "visita", "whatsapp", "email", "proposta", "nota"]).default("nota"), description: nullableString, scheduledAt: nullableString, doneAt: nullableString, byUserId: nullableString });
const scheduleVisit = z.object({ leadId: id, scheduledAt: z.string().min(1), description: z.string().min(1) });

const listingCreate = z.object({ propertyId: id, askingPrice: z.coerce.number().positive(), status: z.enum(["ativa", "sob_proposta", "vendida", "cancelada"]).default("ativa"), commissionPct: z.coerce.number().min(0).default(6) });
const listingPatch = listingCreate.partial();
const proposalCreate = z.object({ listingId: id, buyerClientId: id, brokerUserId: id, offeredPrice: z.coerce.number().positive(), conditions: nullableString, status: z.enum(["em_analise", "contraproposta", "aceita", "recusada"]).default("em_analise"), history: z.array(z.object({ at: z.string(), by: z.enum(["buyer", "seller"]), price: z.coerce.number(), note: nullableString })).default([]) });
const moveProposal = z.object({ proposalId: id, status: z.enum(["em_analise", "contraproposta", "aceita", "recusada"]), note: z.string().optional() });
const saleContractCreate = z.object({ listingId: id, buyerClientId: id, sellerClientId: id, finalPrice: z.coerce.number().positive(), signedAt: nullableString, paymentTerms: nullableString, status: z.enum(["em_andamento", "fechado", "cancelado"]).default("fechado") });

const condoCreate = z.object({ name: z.string().min(1), address: z.string().min(1), unitCount: z.coerce.number().int().min(0), managerUserId: nullableString, adminFeePct: z.coerce.number().min(0).default(10) });
const condoPatch = condoCreate.partial();
const unitCreate = z.object({ condoId: id, label: z.string().min(1), ownerClientId: nullableString, currentResidentClientId: nullableString, areaM2: z.coerce.number().nullable().default(null), fractionPct: z.coerce.number().min(0).default(0) });
const condoFees = z.object({ condoId: id, referenceMonth: z.string().min(7), dueDate: z.string().min(10), amount: z.coerce.number().positive() });
const expenseCreate = z.object({ condoId: id, referenceMonth: z.string().min(7), description: z.string().min(1), totalAmount: z.coerce.number().positive(), apportionment: z.enum(["igual", "fracao_ideal"]).default("igual"), status: z.enum(["lancada", "rateada", "paga"]).default("lancada") });
const meetingCreate = z.object({ condoId: id, date: z.string().min(10), kind: z.enum(["ordinaria", "extraordinaria"]).default("ordinaria"), summary: nullableString, ataDocumentId: nullableString });

function requireTarget(action: AutomationActionConfig): string {
  if (!action.targetId) throw new Error("A ação exige um registro alvo.");
  return action.targetId;
}

function compactResult(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return { value: value ?? null };
  const row = value as Record<string, unknown>;
  return {
    id: row.id ?? null,
    status: row.status ?? row.effectiveStatus ?? null,
    name: row.name ?? row.title ?? row.description ?? null,
    ...(typeof row.whatsappSent === "boolean" ? { whatsappSent: row.whatsappSent } : {}),
    ...(row.whatsappReason ? { whatsappReason: row.whatsappReason } : {}),
  };
}

export async function executeAutomationAction(ctx: RepoContext, action: AutomationActionConfig): Promise<Record<string, unknown>> {
  validateAutomationAction(action);
  let result: unknown;
  switch (action.kind) {
    case "create_client": result = await clientsRepository.create(ctx, clientCreate.parse(action.payload)); break;
    case "update_client": result = await clientsRepository.update(ctx, requireTarget(action), clientPatch.parse(action.payload)); break;
    case "create_property": result = await propertiesRepository.create(ctx, propertyCreate.parse(action.payload)); break;
    case "update_property": result = await propertiesRepository.update(ctx, requireTarget(action), propertyPatch.parse(action.payload)); break;
    case "create_rental_contract": result = await rentalsRepository.create(ctx, rentalCreate.parse(action.payload)); break;
    case "update_rental_contract": result = await rentalsRepository.update(ctx, requireTarget(action), rentalPatch.parse(action.payload)); break;
    case "create_charge_standalone": result = await billingRepository.emitStandalone(ctx, chargeStandalone.parse(action.payload)); break;
    case "create_charge_and_send_whatsapp": {
      const charge = await billingRepository.emitStandalone(ctx, chargeStandalone.parse(action.payload));
      if (!charge) throw new Error("Não foi possível criar a cobrança.");
      const delivery = await billingRepository.sendChargeWhatsApp(ctx, charge.id);
      result = { ...charge, whatsappSent: delivery.sent, whatsappReason: delivery.reason ?? null };
      break;
    }
    case "create_charge_for_installment": { const p = chargeForSource.parse(action.payload); result = await billingRepository.emitForInstallment(ctx, p.sourceId, p.method); break; }
    case "create_charge_for_condo_fee": { const p = chargeForSource.parse(action.payload); result = await billingRepository.emitForCondoFee(ctx, p.sourceId, p.method); break; }
    case "update_charge": result = await billingRepository.updateCharge(ctx, requireTarget(action), chargePatch.parse(action.payload)); break;
    case "mark_charge_paid": result = await billingRepository.markPaidManually(ctx, requireTarget(action)); break;
    case "create_crm_lead": result = await crmRepository.createLead(ctx, leadCreate.parse(action.payload)); break;
    case "update_crm_lead": result = await crmRepository.updateLead(ctx, requireTarget(action), leadPatch.parse(action.payload)); break;
    case "create_crm_activity": result = await crmRepository.logActivity(ctx, activityCreate.parse(action.payload)); break;
    case "schedule_visit": { const p = scheduleVisit.parse(action.payload); result = await crmRepository.scheduleVisit(ctx, p.leadId, p.scheduledAt, p.description); break; }
    case "create_sale_listing": result = await salesRepository.createListing(ctx, listingCreate.parse(action.payload)); break;
    case "update_sale_listing": result = await salesRepository.updateListing(ctx, requireTarget(action), listingPatch.parse(action.payload)); break;
    case "create_sale_proposal": result = await salesRepository.registerProposal(ctx, proposalCreate.parse(action.payload)); break;
    case "move_sale_proposal": { const p = moveProposal.parse(action.payload); result = await salesRepository.moveProposal(ctx, p.proposalId, p.status, p.note); break; }
    case "create_sale_contract": result = await salesRepository.closeSaleContract(ctx, saleContractCreate.parse(action.payload)); break;
    case "create_condo": result = await condosRepository.create(ctx, condoCreate.parse(action.payload)); break;
    case "update_condo": result = await condosRepository.update(ctx, requireTarget(action), condoPatch.parse(action.payload)); break;
    case "create_condo_unit": result = await condosRepository.addUnit(ctx, unitCreate.parse(action.payload)); break;
    case "generate_condo_fees": { const p = condoFees.parse(action.payload); result = await condosRepository.generateFees(ctx, p.condoId, p.referenceMonth, p.dueDate, p.amount); break; }
    case "create_condo_expense": result = await condosRepository.registerExpense(ctx, expenseCreate.parse(action.payload)); break;
    case "apportion_condo_expense": result = await condosRepository.apportionExpense(ctx, requireTarget(action)); break;
    case "create_condo_meeting": result = await condosRepository.createMeeting(ctx, meetingCreate.parse(action.payload)); break;
    default: throw new Error(`Ação não suportada: ${String(action.kind)}`);
  }
  if (!result) throw new Error("A ação não encontrou o registro necessário ou não retornou resultado.");
  return Array.isArray(result) ? { count: result.length } : compactResult(result);
}

export function validateAutomationAction(action: AutomationActionConfig): Record<string, unknown> {
  switch (action.kind) {
    case "create_client": return clientCreate.parse(action.payload);
    case "update_client": requireTarget(action); return clientPatch.parse(action.payload);
    case "create_property": return propertyCreate.parse(action.payload);
    case "update_property": requireTarget(action); return propertyPatch.parse(action.payload);
    case "create_rental_contract": return rentalCreate.parse(action.payload);
    case "update_rental_contract": requireTarget(action); return rentalPatch.parse(action.payload);
    case "create_charge_standalone": return chargeStandalone.parse(action.payload);
    case "create_charge_and_send_whatsapp": return chargeStandalone.parse(action.payload);
    case "create_charge_for_installment": return chargeForSource.parse(action.payload);
    case "create_charge_for_condo_fee": return chargeForSource.parse(action.payload);
    case "update_charge": requireTarget(action); return chargePatch.parse(action.payload);
    case "mark_charge_paid": requireTarget(action); return {};
    case "create_crm_lead": return leadCreate.parse(action.payload);
    case "update_crm_lead": requireTarget(action); return leadPatch.parse(action.payload);
    case "create_crm_activity": return activityCreate.parse(action.payload);
    case "schedule_visit": return scheduleVisit.parse(action.payload);
    case "create_sale_listing": return listingCreate.parse(action.payload);
    case "update_sale_listing": requireTarget(action); return listingPatch.parse(action.payload);
    case "create_sale_proposal": return proposalCreate.parse(action.payload);
    case "move_sale_proposal": return moveProposal.parse(action.payload);
    case "create_sale_contract": return saleContractCreate.parse(action.payload);
    case "create_condo": return condoCreate.parse(action.payload);
    case "update_condo": requireTarget(action); return condoPatch.parse(action.payload);
    case "create_condo_unit": return unitCreate.parse(action.payload);
    case "generate_condo_fees": return condoFees.parse(action.payload);
    case "create_condo_expense": return expenseCreate.parse(action.payload);
    case "apportion_condo_expense": requireTarget(action); return {};
    case "create_condo_meeting": return meetingCreate.parse(action.payload);
    default: throw new Error(`Ação não suportada: ${String(action.kind)}`);
  }
}

export const AUTOMATION_ACTION_LABELS: Record<AutomationActionKind, string> = {
  create_client: "Criar cliente",
  update_client: "Editar cliente",
  create_property: "Criar imóvel",
  update_property: "Editar imóvel",
  create_rental_contract: "Criar contrato de locação",
  update_rental_contract: "Editar contrato de locação",
  create_charge_standalone: "Criar cobrança avulsa",
  create_charge_and_send_whatsapp: "Criar cobrança e enviar WhatsApp",
  create_charge_for_installment: "Emitir cobrança de parcela",
  create_charge_for_condo_fee: "Emitir cobrança de condomínio",
  update_charge: "Editar cobrança",
  mark_charge_paid: "Marcar cobrança paga",
  create_crm_lead: "Criar lead",
  update_crm_lead: "Editar lead",
  create_crm_activity: "Criar atividade CRM",
  schedule_visit: "Agendar visita",
  create_sale_listing: "Criar anúncio de venda",
  update_sale_listing: "Editar anúncio de venda",
  create_sale_proposal: "Registrar proposta",
  move_sale_proposal: "Mover proposta",
  create_sale_contract: "Criar contrato de venda",
  create_condo: "Criar condomínio",
  update_condo: "Editar condomínio",
  create_condo_unit: "Criar unidade",
  generate_condo_fees: "Gerar taxas condominiais",
  create_condo_expense: "Criar despesa condominial",
  apportion_condo_expense: "Ratear despesa",
  create_condo_meeting: "Criar assembleia",
};
