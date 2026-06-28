import { expect, test } from "@playwright/test";

const reports = [
  "overview.executive",
  "finance.receivables",
  "finance.overdue",
  "finance.repasses",
  "finance.commissions",
  "rentals.contracts",
  "rentals.expiring",
  "rentals.overdue",
  "rentals.available_properties",
  "sales.listings",
  "sales.contracts",
  "sales.proposals",
  "crm.funnel",
  "crm.activities",
  "documents.status",
  "documents.expiring",
  "condos.fees",
  "condos.expenses",
  "condos.meetings",
] as const;

const formats = ["csv", "json", "html", "xls", "xlsx", "pdf"] as const;

async function fetchWithRetry(page: import("@playwright/test").Page, url: string, maxRetries = 3) {
  for (let attempt = 0; ; attempt++) {
    const res = await page.request.get(url);
    if (res.status() !== 429 || attempt >= maxRetries) return res;
    await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
  }
}

test.describe("reports export", () => {
  test.describe.configure({ mode: "serial" });

  for (const report of reports) {
    for (const format of formats) {
      test(`exports ${report} as ${format}`, async ({ page }) => {
        const response = await fetchWithRetry(page, `/api/reports/export?report=${report}&format=${format}`);
        const body = await response.text();
        expect(response.ok(), `${response.status()} ${body}`).toBeTruthy();
        expect(response.headers()["content-disposition"]).toContain(report.replace(/\./g, "-"));
        expect(response.headers()["content-type"]).toContain(format === "xls" ? "excel" : format === "xlsx" ? "openxml" : format === "pdf" ? "pdf" : format === "csv" ? "csv" : format);
        expect(body.length).toBeGreaterThan(0);
      });
    }
  }
});
