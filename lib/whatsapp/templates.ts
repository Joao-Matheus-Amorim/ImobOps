// Message templates. Each is a function of variables → rendered pt-BR text.
// In Meta Business API these map to approved template names; here we render text.

export type TemplateKey =
  | "rental.reminder_3_days_before"
  | "rental.reminder_due_today"
  | "rental.overdue_first_notice"
  | "rental.overdue_second_notice"
  | "rental.boleto_delivery"
  | "condo.fee_reminder"
  | "condo.fee_overdue"
  | "crm.lead_welcome"
  | "crm.visit_confirmation";

type Renderer = (vars: Record<string, string>) => string;

export const TEMPLATES: Record<TemplateKey, Renderer> = {
  "rental.reminder_3_days_before": (v) =>
    `Olá ${v.nome ?? ""}! Seu aluguel de ${v.valor ?? ""} vence em 3 dias (${v.vencimento ?? ""}). Qualquer dúvida, estamos à disposição.`,
  "rental.reminder_due_today": (v) =>
    `Olá ${v.nome ?? ""}! Hoje é o vencimento do seu aluguel de ${v.valor ?? ""}. Se já pagou, desconsidere esta mensagem.`,
  "rental.overdue_first_notice": (v) =>
    `Olá ${v.nome ?? ""}. Identificamos que o aluguel de ${v.valor ?? ""} (venc. ${v.vencimento ?? ""}) está em aberto. Pode nos enviar o comprovante ou regularizar?`,
  "rental.overdue_second_notice": (v) =>
    `Olá ${v.nome ?? ""}. Reforçamos que o aluguel de ${v.valor ?? ""} segue em aberto desde ${v.vencimento ?? ""}. Entre em contato para evitarmos encargos.`,
  "rental.boleto_delivery": (v) =>
    `Olá ${v.nome ?? ""}! Segue o boleto do aluguel referente a ${v.referencia ?? ""}. Vencimento: ${v.vencimento ?? ""}. Valor: ${v.valor ?? ""}.`,
  "condo.fee_reminder": (v) =>
    `Olá ${v.nome ?? ""}! A taxa condominial da unidade ${v.unidade ?? ""} (${v.referencia ?? ""}) vence em ${v.vencimento ?? ""}. Valor: ${v.valor ?? ""}.`,
  "condo.fee_overdue": (v) =>
    `Olá ${v.nome ?? ""}. A taxa condominial da unidade ${v.unidade ?? ""} está em atraso. Por favor, regularize para manter as contas do condomínio em dia.`,
  "crm.lead_welcome": (v) =>
    `Olá ${v.nome ?? ""}! Obrigado pelo contato. Um de nossos corretores vai te atender em instantes. Pode nos dizer o que procura?`,
  "crm.visit_confirmation": (v) =>
    `Olá ${v.nome ?? ""}! Confirmando sua visita ao imóvel em ${v.endereco ?? ""} no dia ${v.data ?? ""} às ${v.hora ?? ""}. Até lá!`,
};

export function renderTemplate(key: TemplateKey, vars: Record<string, string>): string {
  const renderer = TEMPLATES[key];
  if (!renderer) throw new Error(`Template desconhecido: ${key}`);
  return renderer(vars);
}

export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];
