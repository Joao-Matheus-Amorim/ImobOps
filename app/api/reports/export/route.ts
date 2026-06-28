import { NextResponse } from "next/server";
import { getPrincipal } from "@/lib/session";
import { requireContext } from "@/lib/api-auth";
import { can } from "@/lib/permissions/enforce";
import { buildReportById } from "@/lib/reports/builders";
import { exportReport, reportContentType, reportFileName } from "@/lib/reports/export";
import { parseReportFormat, parseReportId, reportDefinition } from "@/lib/reports/definitions";

export async function GET(request: Request) {
  const auth = await requireContext(request, { limit: 120, bucket: "reports-export" });
  if ("error" in auth) return auth.error;

  const principal = await getPrincipal();
  if (!principal) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const reportId = parseReportId(url.searchParams.get("report"));
  const format = parseReportFormat(url.searchParams.get("format"));
  const definition = reportDefinition(reportId);

  if (!can(principal, "reports", "view") || !can(principal, definition.permissionFeature, "view")) {
    return NextResponse.json({ error: "Permissão negada." }, { status: 403 });
  }

  const report = await buildReportById(auth.ctx, reportId);
  const body = exportReport(report, format);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": reportContentType(format),
      "content-disposition": `attachment; filename="${reportFileName(report, format)}"`,
      "cache-control": "no-store",
    },
  });
}
