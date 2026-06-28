import { describe, expect, it } from "vitest";
import { DEMO_TENANCY_ID, DEMO_USERS } from "@/lib/constants";
import { buildReportById, buildReportsDashboardData } from "./builders";
import { REPORT_DEFINITIONS, REPORT_TABS, type ReportFormat, type ReportId } from "./definitions";
import { exportReport, reportContentType, reportFileName } from "./export";

const ctx = { tenancyId: DEMO_TENANCY_ID, userId: DEMO_USERS.admin };
const formats: ReportFormat[] = ["csv", "json", "html", "xls"];

describe("reports definitions", () => {
  it("keeps every report assigned to an existing tab and export format", () => {
    const tabs = new Set(REPORT_TABS.map((tab) => tab.id));

    for (const definition of Object.values(REPORT_DEFINITIONS)) {
      expect(tabs.has(definition.tab)).toBe(true);
      expect(definition.columns.length).toBeGreaterThan(0);
      expect(definition.formats).toEqual(expect.arrayContaining(formats));
    }
  });
});

describe("reports builders", () => {
  it("builds the dashboard report groups", async () => {
    const data = await buildReportsDashboardData(ctx);

    expect(data.overview.executive.definition.id).toBe("overview.executive");
    expect(data.finance.overdue.definition.id).toBe("finance.overdue");
    expect(data.rentals.contracts.definition.id).toBe("rentals.contracts");
    expect(data.sales.listings.definition.id).toBe("sales.listings");
    expect(data.crm.funnel.definition.id).toBe("crm.funnel");
    expect(data.documents.status.definition.id).toBe("documents.status");
    expect(data.condos.fees.definition.id).toBe("condos.fees");
  });

  it("builds every defined report id", async () => {
    for (const reportId of Object.keys(REPORT_DEFINITIONS) as ReportId[]) {
      const report = await buildReportById(ctx, reportId);

      expect(report.definition.id).toBe(reportId);
      expect(Array.isArray(report.rows)).toBe(true);
      expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe("reports export", () => {
  it("exports every report in every supported format", async () => {
    for (const reportId of Object.keys(REPORT_DEFINITIONS) as ReportId[]) {
      const report = await buildReportById(ctx, reportId);

      for (const format of formats) {
        const exported = exportReport(report, format);
        expect(exported.length).toBeGreaterThan(0);
        expect(reportFileName(report, format)).toContain(reportId.replace(/\./g, "-"));
        expect(reportContentType(format)).toContain(format === "xls" ? "excel" : format === "csv" ? "csv" : format);
      }
    }
  });
});
