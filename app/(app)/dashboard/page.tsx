import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/session";
import { routes } from "@/lib/routes";
import { buildDashboardData, buildSimplifiedDashboardData } from "@/components/domain/dashboard/dashboard-data";
import { Dashboard } from "@/components/domain/dashboard/dashboard-views";


const GREETING: Record<string, string> = {
  admin: "Visão geral da imobiliária",
  manager: "Visão gerencial",
  broker: "Sua carteira de vendas e locação",
  finance: "Painel financeiro",
  condo_admin: "Gestão de condomínios",
  viewer: "Resumo da operação",
};


export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect(routes.login);
  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  // Use the simplified dashboard data for all users except admin and manager
  const isSimplifiedMode = !(user.role === "admin" || user.role === "manager");
  const data = isSimplifiedMode ? await buildSimplifiedDashboardData(ctx) : await buildDashboardData(ctx);

  return (
    <div className="space-y-5">
      <PageHeader title={`Olá, ${user.displayName.split(" ")[0]}`} description={GREETING[user.role]} />
      <Dashboard data={data} isSimplifiedMode={isSimplifiedMode} />
    </div>
  );
}
