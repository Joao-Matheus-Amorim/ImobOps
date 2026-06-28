import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Download, FileJson, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatBRL, formatDate } from "@/lib/utils";
import type { BuiltReport, ReportRowData, ReportsDashboardData, ReportValue } from "@/lib/reports/builders";
import type { ReportFormat, ReportId, ReportTab } from "@/lib/reports/definitions";
import { REPORT_TABS } from "@/lib/reports/definitions";

const TAB_REPORTS: Record<ReportTab, ReportId[]> = {
  overview: ["overview.executive"],
  finance: ["finance.receivables", "finance.overdue", "finance.repasses", "finance.commissions"],
  rentals: ["rentals.contracts", "rentals.expiring", "rentals.overdue", "rentals.available_properties"],
  sales: ["sales.listings", "sales.contracts", "sales.proposals"],
  crm: ["crm.funnel", "crm.activities"],
  documents: ["documents.status", "documents.expiring"],
  condos: ["condos.fees", "condos.expenses", "condos.meetings"],
};

const FORMAT_ICON: Record<ReportFormat, typeof Download> = {
  csv: Download,
  json: FileJson,
  html: Printer,
  xls: FileSpreadsheet,
};

function valueLabel(value: ReportValue): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : formatBRL(value);
  if (!value) return "-";
  return value;
}

function reportById(data: ReportsDashboardData, id: ReportId): BuiltReport {
  const map: Record<ReportId, BuiltReport> = {
    "overview.executive": data.overview.executive,
    "finance.receivables": data.finance.receivables,
    "finance.overdue": data.finance.overdue,
    "finance.repasses": data.finance.repasses,
    "finance.commissions": data.finance.commissions,
    "rentals.contracts": data.rentals.contracts,
    "rentals.expiring": data.rentals.expiring,
    "rentals.overdue": data.rentals.overdue,
    "rentals.available_properties": data.rentals.availableProperties,
    "sales.listings": data.sales.listings,
    "sales.contracts": data.sales.contracts,
    "sales.proposals": data.sales.proposals,
    "crm.funnel": data.crm.funnel,
    "crm.activities": data.crm.activities,
    "documents.status": data.documents.status,
    "documents.expiring": data.documents.expiring,
    "condos.fees": data.condos.fees,
    "condos.expenses": data.condos.expenses,
    "condos.meetings": data.condos.meetings,
  };
  return map[id];
}

function ExportActions({ report }: { report: BuiltReport }) {
  return (
    <div className="flex flex-wrap gap-2">
      {report.definition.formats.map((format) => {
        const Icon = FORMAT_ICON[format];
        return (
          <Button key={format} asChild size="sm" variant="outline">
            <a href={`/api/reports/export?report=${report.definition.id}&format=${format}`}>
              <Icon className="size-4" /> {format.toUpperCase()}
            </a>
          </Button>
        );
      })}
    </div>
  );
}

function TotalsBar({ report }: { report: BuiltReport }) {
  const entries = Object.entries(report.totals);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="outline" className="capitalize">
          {key}: {valueLabel(value)}
        </Badge>
      ))}
    </div>
  );
}

function ReportTable({ report, limit }: { report: BuiltReport; limit?: number }) {
  const rows = typeof limit === "number" ? report.rows.slice(0, limit) : report.rows;
  return (
    <div className="overflow-x-auto rounded-xl border border-primary/12">
      <table className="min-w-full divide-y divide-primary/10 text-sm">
        <thead className="bg-background/35 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {report.definition.columns.map((column) => (
              <th key={column.key} className={`px-3 py-2 ${column.align === "right" ? "text-right" : "text-left"}`}>
                {column.label}
              </th>
            ))}
            <th className="px-3 py-2 text-right">Origem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-primary/10">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={report.definition.columns.length + 1} className="px-3 py-8 text-center text-muted-foreground">
                Sem registros para este relatório.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="bg-background/15 transition hover:bg-primary/8">
                {report.definition.columns.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap px-3 py-2 ${column.align === "right" ? "text-right font-medium" : "text-left"}`}>
                    {valueLabel(row.values[column.key] ?? null)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  {row.href ? (
                    <Link href={row.href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Abrir <ArrowUpRight className="size-3" />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportCard({ report, compact = false }: { report: BuiltReport; compact?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{report.definition.title}</CardTitle>
            <Badge variant={report.definition.level === "professional" ? "default" : "outline"}>
              {report.definition.level === "professional" ? "Profissional" : "Simplificado"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{report.definition.description}</p>
        </div>
        <ExportActions report={report} />
      </CardHeader>
      <CardContent className="space-y-3">
        <TotalsBar report={report} />
        <ReportTable report={report} limit={compact ? 8 : undefined} />
      </CardContent>
    </Card>
  );
}

function AlertList({ alerts }: { alerts: ReportRowData[] }) {
  return (
    <Card className="border-primary/25 bg-[#102f4d]/82">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Prioridades operacionais</CardTitle>
        <AlertTriangle className="size-4 text-primary" />
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma prioridade crítica no momento.</p>
        ) : (
          alerts.map((alert) => (
            <Link
              key={`${alert.id}-${alert.href ?? ""}`}
              href={alert.href ?? "/reports"}
              className="flex items-center justify-between gap-3 rounded-xl border border-primary/12 bg-background/25 px-3 py-2.5 transition hover:border-primary/45 hover:bg-primary/8"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {valueLabel(alert.values.cliente ?? alert.values.locatario ?? alert.values.indicador ?? alert.values.imovel ?? "Atenção")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Object.entries(alert.values).slice(0, 4).map(([key, value]) => `${key}: ${valueLabel(value)}`).join(" · ")}
                </p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-primary" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function Tabs({ activeTab }: { activeTab: ReportTab }) {
  return (
    <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
      {REPORT_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/reports?tab=${tab.id}`}
          className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-primary/55 ${activeTab === tab.id ? "border-primary/55 bg-primary/12 shadow-glow-sm" : "border-primary/14 bg-background/25"}`}
        >
          <p className="font-semibold text-foreground">{tab.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tab.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function ReportsView({ data, activeTab }: { data: ReportsDashboardData; activeTab: ReportTab }) {
  const reportIds = TAB_REPORTS[activeTab];

  return (
    <div className="space-y-5">
      <Tabs activeTab={activeTab} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="A receber aberto" value={formatBRL(data.overview.kpis.receivableOpen)} />
        <StatCard label="Inadimplência" value={formatBRL(data.overview.kpis.overdueAmount)} accent="destructive" />
        <StatCard label="Ocupação" value={`${data.overview.kpis.occupancyPct}%`} hint={`${data.overview.kpis.activeRentals} contratos ativos`} accent="success" />
        <StatCard label="Imóveis disponíveis" value={String(data.overview.kpis.availableProperties)} accent="gold" />
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <ReportCard report={data.overview.executive} />
          <AlertList alerts={data.overview.alerts} />
        </div>
      ) : (
        <div className="space-y-4">
          {reportIds.map((id) => <ReportCard key={id} report={reportById(data, id)} compact={id !== reportIds[0]} />)}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Modelos de exportação</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">CSV, XLS compatível com Excel, JSON para integração e HTML imprimível para salvar como PDF.</p>
          </div>
          <FileText className="size-5 text-primary" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-primary/12 bg-background/25 p-3">
            <p className="font-semibold">CSV</p>
            <p className="mt-1 text-sm text-muted-foreground">Separador ponto e vírgula, compatível com Excel brasileiro.</p>
          </div>
          <div className="rounded-xl border border-primary/12 bg-background/25 p-3">
            <p className="font-semibold">XLS</p>
            <p className="mt-1 text-sm text-muted-foreground">HTML table com MIME de Excel, sem dependência externa.</p>
          </div>
          <div className="rounded-xl border border-primary/12 bg-background/25 p-3">
            <p className="font-semibold">JSON</p>
            <p className="mt-1 text-sm text-muted-foreground">Inclui definição, totais, colunas e linhas para integrações.</p>
          </div>
          <div className="rounded-xl border border-primary/12 bg-background/25 p-3">
            <p className="font-semibold">HTML/PDF</p>
            <p className="mt-1 text-sm text-muted-foreground">Layout imprimível; use o navegador para salvar PDF sem dependência externa.</p>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Atualizado {formatDate(data.generatedAt)}</p>
    </div>
  );
}
