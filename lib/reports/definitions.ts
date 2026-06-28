import type { FeatureKey } from "@/lib/types/permissions";

export type ReportTab = "overview" | "finance" | "rentals" | "sales" | "crm" | "documents" | "condos";
export type ReportLevel = "simplified" | "professional";
export type ReportFormat = "csv" | "json" | "html" | "xls" | "xlsx" | "pdf";
export type ReportId =
  | "overview.executive"
  | "finance.receivables"
  | "finance.overdue"
  | "finance.repasses"
  | "finance.commissions"
  | "rentals.contracts"
  | "rentals.expiring"
  | "rentals.overdue"
  | "rentals.available_properties"
  | "sales.listings"
  | "sales.contracts"
  | "sales.proposals"
  | "crm.funnel"
  | "crm.activities"
  | "documents.status"
  | "documents.expiring"
  | "condos.fees"
  | "condos.expenses"
  | "condos.meetings";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface ReportDefinition {
  id: ReportId;
  tab: ReportTab;
  title: string;
  description: string;
  level: ReportLevel;
  permissionFeature: FeatureKey;
  formats: ReportFormat[];
  columns: ReportColumn[];
}

export const REPORT_TABS: { id: ReportTab; label: string; description: string }[] = [
  {
    id: "overview",
    label: "Visão Geral",
    description: "Painel executivo com KPIs, alertas e prioridades da operação.",
  },
  {
    id: "finance",
    label: "Financeiro",
    description: "Recebíveis, inadimplência, repasses e comissões.",
  },
  {
    id: "rentals",
    label: "Locações",
    description: "Contratos, vencimentos, inadimplência e imóveis disponíveis.",
  },
  {
    id: "sales",
    label: "Vendas",
    description: "Listagens, propostas, contratos fechados e comissões comerciais.",
  },
  {
    id: "crm",
    label: "CRM",
    description: "Funil, atividades, visitas e produtividade comercial.",
  },
  {
    id: "documents",
    label: "Documentos",
    description: "Pendências, validação, rejeições e vencimentos documentais.",
  },
  {
    id: "condos",
    label: "Condomínios",
    description: "Taxas, inadimplência, despesas e assembleias.",
  },
];

const ALL_FORMATS: ReportFormat[] = ["csv", "json", "html", "xls", "xlsx", "pdf"];

export const REPORT_DEFINITIONS: Record<ReportId, ReportDefinition> = {
  "overview.executive": {
    id: "overview.executive",
    tab: "overview",
    title: "Resumo executivo",
    description: "KPIs e alertas principais para tomada de decisão.",
    level: "professional",
    permissionFeature: "reports",
    formats: ALL_FORMATS,
    columns: [
      { key: "area", label: "Área" },
      { key: "indicador", label: "Indicador" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "detalhe", label: "Detalhe" },
    ],
  },
  "finance.receivables": {
    id: "finance.receivables",
    tab: "finance",
    title: "Contas a receber",
    description: "Cobranças abertas, pagas, vencidas e a vencer por cliente e origem.",
    level: "professional",
    permissionFeature: "finance",
    formats: ALL_FORMATS,
    columns: [
      { key: "cliente", label: "Cliente" },
      { key: "descricao", label: "Descrição" },
      { key: "origem", label: "Origem" },
      { key: "metodo", label: "Método" },
      { key: "vencimento", label: "Vencimento" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "finance.overdue": {
    id: "finance.overdue",
    tab: "finance",
    title: "Inadimplência",
    description: "Clientes, imóveis, contratos e valores vencidos para cobrança.",
    level: "professional",
    permissionFeature: "finance",
    formats: ALL_FORMATS,
    columns: [
      { key: "cliente", label: "Cliente" },
      { key: "imovel", label: "Imóvel" },
      { key: "contrato", label: "Contrato" },
      { key: "referencia", label: "Referência" },
      { key: "vencimento", label: "Vencimento" },
      { key: "diasAtraso", label: "Dias atraso", align: "right" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "finance.repasses": {
    id: "finance.repasses",
    tab: "finance",
    title: "Repasses a proprietários",
    description: "Bruto, taxa de administração e líquido a repassar por contrato.",
    level: "professional",
    permissionFeature: "finance",
    formats: ALL_FORMATS,
    columns: [
      { key: "proprietario", label: "Proprietário" },
      { key: "imovel", label: "Imóvel" },
      { key: "referencia", label: "Referência" },
      { key: "bruto", label: "Bruto", align: "right" },
      { key: "taxaAdmin", label: "Taxa admin", align: "right" },
      { key: "liquido", label: "Líquido", align: "right" },
      { key: "status", label: "Status" },
      { key: "pagoEm", label: "Pago em" },
    ],
  },
  "finance.commissions": {
    id: "finance.commissions",
    tab: "finance",
    title: "Comissões",
    description: "Comissões pendentes e pagas por venda/corretor.",
    level: "simplified",
    permissionFeature: "finance",
    formats: ALL_FORMATS,
    columns: [
      { key: "venda", label: "Venda" },
      { key: "corretor", label: "Corretor" },
      { key: "percentual", label: "%", align: "right" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "status", label: "Status" },
      { key: "pagoEm", label: "Pago em" },
    ],
  },
  "rentals.contracts": {
    id: "rentals.contracts",
    tab: "rentals",
    title: "Carteira de contratos",
    description: "Contratos de locação com locador, locatário, imóvel e valor mensal.",
    level: "professional",
    permissionFeature: "rentals",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "locador", label: "Locador" },
      { key: "locatario", label: "Locatário" },
      { key: "inicio", label: "Início" },
      { key: "fim", label: "Fim" },
      { key: "aluguel", label: "Aluguel", align: "right" },
      { key: "vencimento", label: "Vencimento" },
      { key: "status", label: "Status" },
    ],
  },
  "rentals.expiring": {
    id: "rentals.expiring",
    tab: "rentals",
    title: "Contratos a vencer",
    description: "Contratos ativos com encerramento nos próximos 90 dias.",
    level: "simplified",
    permissionFeature: "rentals",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "locador", label: "Locador" },
      { key: "locatario", label: "Locatário" },
      { key: "fim", label: "Fim" },
      { key: "diasRestantes", label: "Dias restantes", align: "right" },
      { key: "aluguel", label: "Aluguel", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "rentals.overdue": {
    id: "rentals.overdue",
    tab: "rentals",
    title: "Locações inadimplentes",
    description: "Contratos com parcelas em atraso e total aberto.",
    level: "professional",
    permissionFeature: "rentals",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "locador", label: "Locador" },
      { key: "locatario", label: "Locatário" },
      { key: "parcelas", label: "Parcelas", align: "right" },
      { key: "vencimentoMaisAntigo", label: "Venc. mais antigo" },
      { key: "total", label: "Total", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "rentals.available_properties": {
    id: "rentals.available_properties",
    tab: "rentals",
    title: "Imóveis disponíveis para locação",
    description: "Imóveis livres e aptos para nova locação.",
    level: "simplified",
    permissionFeature: "properties",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "proprietario", label: "Proprietário" },
      { key: "tipo", label: "Tipo" },
      { key: "area", label: "Área" },
      { key: "dormitorios", label: "Dorm." },
      { key: "status", label: "Status" },
    ],
  },
  "sales.listings": {
    id: "sales.listings",
    tab: "sales",
    title: "Listagens de venda",
    description: "Imóveis anunciados, valor pedido, proprietário e propostas recebidas.",
    level: "professional",
    permissionFeature: "sales",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "proprietario", label: "Proprietário" },
      { key: "valorPedido", label: "Valor pedido", align: "right" },
      { key: "comissao", label: "Comissão %", align: "right" },
      { key: "propostas", label: "Propostas", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "sales.contracts": {
    id: "sales.contracts",
    tab: "sales",
    title: "Contratos de venda",
    description: "Vendas fechadas/em andamento com comprador, vendedor e valor final.",
    level: "professional",
    permissionFeature: "sales",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "comprador", label: "Comprador" },
      { key: "vendedor", label: "Vendedor" },
      { key: "valorFinal", label: "Valor final", align: "right" },
      { key: "assinadoEm", label: "Assinado em" },
      { key: "status", label: "Status" },
    ],
  },
  "sales.proposals": {
    id: "sales.proposals",
    tab: "sales",
    title: "Propostas comerciais",
    description: "Propostas por comprador, corretor, imóvel e etapa de negociação.",
    level: "simplified",
    permissionFeature: "sales",
    formats: ALL_FORMATS,
    columns: [
      { key: "imovel", label: "Imóvel" },
      { key: "comprador", label: "Comprador" },
      { key: "corretor", label: "Corretor" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "status", label: "Status" },
      { key: "condicoes", label: "Condições" },
    ],
  },
  "crm.funnel": {
    id: "crm.funnel",
    tab: "crm",
    title: "Funil comercial",
    description: "Leads agrupados por etapa, origem, interesse e responsável.",
    level: "professional",
    permissionFeature: "crm",
    formats: ALL_FORMATS,
    columns: [
      { key: "etapa", label: "Etapa" },
      { key: "quantidade", label: "Quantidade", align: "right" },
      { key: "locacao", label: "Locação", align: "right" },
      { key: "venda", label: "Venda", align: "right" },
      { key: "condominio", label: "Condomínio", align: "right" },
      { key: "outro", label: "Outro", align: "right" },
    ],
  },
  "crm.activities": {
    id: "crm.activities",
    tab: "crm",
    title: "Atividades e visitas",
    description: "Agenda comercial, visitas pendentes/concluídas e interações registradas.",
    level: "simplified",
    permissionFeature: "crm",
    formats: ALL_FORMATS,
    columns: [
      { key: "lead", label: "Lead" },
      { key: "tipo", label: "Tipo" },
      { key: "descricao", label: "Descrição" },
      { key: "agendadoPara", label: "Agendado para" },
      { key: "concluidoEm", label: "Concluído em" },
      { key: "responsavel", label: "Responsável" },
    ],
  },
  "documents.status": {
    id: "documents.status",
    tab: "documents",
    title: "Status documental",
    description: "Documentos por entidade, tipo, status, upload e validação.",
    level: "professional",
    permissionFeature: "documents",
    formats: ALL_FORMATS,
    columns: [
      { key: "entidade", label: "Entidade" },
      { key: "origem", label: "Origem" },
      { key: "tipo", label: "Tipo" },
      { key: "titulo", label: "Título" },
      { key: "status", label: "Status" },
      { key: "validade", label: "Validade" },
      { key: "enviadoEm", label: "Enviado em" },
    ],
  },
  "documents.expiring": {
    id: "documents.expiring",
    tab: "documents",
    title: "Documentos vencendo/vencidos",
    description: "Documentos vencidos ou com validade nos próximos 30 dias.",
    level: "simplified",
    permissionFeature: "documents",
    formats: ALL_FORMATS,
    columns: [
      { key: "entidade", label: "Entidade" },
      { key: "origem", label: "Origem" },
      { key: "tipo", label: "Tipo" },
      { key: "titulo", label: "Título" },
      { key: "validade", label: "Validade" },
      { key: "dias", label: "Dias", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "condos.fees": {
    id: "condos.fees",
    tab: "condos",
    title: "Taxas de condomínio",
    description: "Taxas por condomínio, unidade, pagador, vencimento e status.",
    level: "professional",
    permissionFeature: "condos",
    formats: ALL_FORMATS,
    columns: [
      { key: "condominio", label: "Condomínio" },
      { key: "unidade", label: "Unidade" },
      { key: "pagador", label: "Pagador" },
      { key: "referencia", label: "Referência" },
      { key: "vencimento", label: "Vencimento" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "status", label: "Status" },
    ],
  },
  "condos.expenses": {
    id: "condos.expenses",
    tab: "condos",
    title: "Despesas de condomínio",
    description: "Despesas lançadas/rateadas por condomínio e referência.",
    level: "simplified",
    permissionFeature: "condos",
    formats: ALL_FORMATS,
    columns: [
      { key: "condominio", label: "Condomínio" },
      { key: "referencia", label: "Referência" },
      { key: "descricao", label: "Descrição" },
      { key: "valor", label: "Valor", align: "right" },
      { key: "rateio", label: "Rateio" },
      { key: "status", label: "Status" },
    ],
  },
  "condos.meetings": {
    id: "condos.meetings",
    tab: "condos",
    title: "Assembleias",
    description: "Assembleias ordinárias/extraordinárias e atas vinculadas.",
    level: "simplified",
    permissionFeature: "condos",
    formats: ALL_FORMATS,
    columns: [
      { key: "condominio", label: "Condomínio" },
      { key: "data", label: "Data" },
      { key: "tipo", label: "Tipo" },
      { key: "resumo", label: "Resumo" },
      { key: "ata", label: "Ata" },
    ],
  },
};

export function reportDefinition(id: ReportId): ReportDefinition {
  return REPORT_DEFINITIONS[id];
}

export function reportsForTab(tab: ReportTab): ReportDefinition[] {
  return Object.values(REPORT_DEFINITIONS).filter((definition) => definition.tab === tab);
}

export function parseReportTab(value: string | null | undefined): ReportTab {
  return REPORT_TABS.some((tab) => tab.id === value) ? (value as ReportTab) : "overview";
}

export function parseReportId(value: string | null | undefined): ReportId {
  return value && value in REPORT_DEFINITIONS ? (value as ReportId) : "overview.executive";
}

export function parseReportFormat(value: string | null | undefined): ReportFormat {
  return value === "json" || value === "html" || value === "xls" || value === "xlsx" || value === "pdf" ? value : "csv";
}
