import { Badge, type BadgeProps } from "./badge";

// Maps domain status strings to a badge variant + pt-BR label.
const VARIANT: Record<string, BadgeProps["variant"]> = {
  // generic
  disponivel: "success",
  alugado: "default",
  vendido: "secondary",
  em_obra: "warning",
  inativo: "outline",
  // installments / fees
  a_vencer: "default",
  pago: "success",
  atrasado: "destructive",
  cancelado: "outline",
  // rental contracts
  ativo: "success",
  encerrado: "outline",
  inadimplente: "destructive",
  em_renovacao: "warning",
  // listings / proposals
  ativa: "success",
  sob_proposta: "warning",
  vendida: "secondary",
  cancelada: "outline",
  em_analise: "default",
  contraproposta: "warning",
  aceita: "success",
  recusada: "destructive",
  // sale contracts / commissions / repasses
  em_andamento: "warning",
  fechado: "success",
  pendente: "warning",
  paga: "success",
  // condo
  lancada: "default",
  rateada: "warning",
  // conversations
  aberta: "default",
  em_atendimento: "warning",
  encerrada: "outline",
  // charges (billing)
  vencida: "destructive",
  falha: "destructive",
};

const LABEL: Record<string, string> = {
  disponivel: "Disponível",
  alugado: "Alugado",
  vendido: "Vendido",
  em_obra: "Em obra",
  inativo: "Inativo",
  a_vencer: "A vencer",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  ativo: "Ativo",
  encerrado: "Encerrado",
  inadimplente: "Inadimplente",
  em_renovacao: "Em renovação",
  ativa: "Ativa",
  sob_proposta: "Sob proposta",
  vendida: "Vendida",
  cancelada: "Cancelada",
  em_analise: "Em análise",
  contraproposta: "Contraproposta",
  aceita: "Aceita",
  recusada: "Recusada",
  em_andamento: "Em andamento",
  fechado: "Fechado",
  pendente: "Pendente",
  paga: "Paga",
  lancada: "Lançada",
  rateada: "Rateada",
  aberta: "Aberta",
  em_atendimento: "Em atendimento",
  encerrada: "Encerrada",
  vencida: "Vencida",
  falha: "Falha",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "secondary"}>{LABEL[status] ?? status}</Badge>;
}
