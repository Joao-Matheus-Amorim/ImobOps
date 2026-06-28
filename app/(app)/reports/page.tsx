import { PageHeader } from "@/components/ui/page-header";
import { ReportsView } from "@/components/domain/reports/reports-view";
import { guardPage } from "@/lib/guard-page";
import { buildReportsDashboardData } from "@/lib/reports/builders";
import { parseReportTab } from "@/lib/reports/definitions";

export const metadata = { title: "Relatórios e alertas" };

export default async function ReportsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const { ctx } = await guardPage("reports");
  const data = await buildReportsDashboardData(ctx);
  const activeTab = parseReportTab(searchParams?.tab);

  return (
    <div className="space-y-5">
      <PageHeader
        badge="Relatórios"
        title="Central de relatórios"
        description="Relatórios executivos, financeiros e operacionais com exportação CSV, JSON e HTML imprimível."
      />
      <ReportsView data={data} activeTab={activeTab} />
    </div>
  );
}
