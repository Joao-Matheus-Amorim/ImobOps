import { PageHeader } from "@/components/ui/page-header";
import { getSessionUser } from "@/lib/session";
import { buildDashboardData } from "@/components/domain/dashboard/dashboard-data";
import {
  AdminDashboard,
  BrokerDashboard,
  FinanceDashboard,
  CondoDashboard,
  ViewerDashboard,
} from "@/components/domain/dashboard/dashboard-views";

export const metadata = { title: "Dashboard" };

const GREETING: Record<string, string> = {
  admin: "Visão geral da imobiliária",
  manager: "Visão gerencial",
  broker: "Sua carteira de vendas e locação",
  finance: "Painel financeiro",
  condo_admin: "Gestão de condomínios",
  viewer: "Resumo da operação",
};

export default function DashboardPage() {
  const user = getSessionUser();
  const ctx = { tenancyId: user.tenancyId, userId: user.id };
  const data = buildDashboardData(ctx);

  return (
    <div className="space-y-5">
      <PageHeader title={`Olá, ${user.displayName.split(" ")[0]}`} description={GREETING[user.role]} />
      {user.role === "admin" || user.role === "manager" ? (
        <AdminDashboard data={data} />
      ) : user.role === "broker" ? (
        <BrokerDashboard data={data} />
      ) : user.role === "finance" ? (
        <FinanceDashboard data={data} />
      ) : user.role === "condo_admin" ? (
        <CondoDashboard data={data} />
      ) : (
        <ViewerDashboard data={data} />
      )}
    </div>
  );
}
