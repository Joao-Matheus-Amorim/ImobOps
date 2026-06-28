import type { BuiltReport, ReportValue } from "./builders";
import type { ReportFormat } from "./definitions";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

function stringify(value: ReportValue): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function csvEscape(value: ReportValue): string {
  const text = stringify(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function htmlEscape(value: ReportValue): string {
  return stringify(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reportFileName(report: BuiltReport, format: ReportFormat): string {
  const slug = report.definition.id.replace(/\./g, "-");
  const date = report.generatedAt.slice(0, 10);
  if (format === "xls") return `${slug}-${date}.xls`;
  if (format === "xlsx") return `${slug}-${date}.xlsx`;
  if (format === "pdf") return `${slug}-${date}.pdf`;
  return `${slug}-${date}.${format === "html" ? "html" : format}`;
}

export function reportContentType(format: ReportFormat): string {
  if (format === "json") return "application/json; charset=utf-8";
  if (format === "html") return "text/html; charset=utf-8";
  if (format === "xls") return "application/vnd.ms-excel; charset=utf-8";
  if (format === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (format === "pdf") return "application/pdf";
  return "text/csv; charset=utf-8";
}

export function exportCsv(report: BuiltReport): string {
  const headers = report.definition.columns.map((column) => csvEscape(column.label)).join(";");
  const rows = report.rows.map((row) =>
    report.definition.columns.map((column) => csvEscape(row.values[column.key] ?? "")).join(";"),
  );
  return [`Relatório;${csvEscape(report.definition.title)}`, `Gerado em;${csvEscape(report.generatedAt)}`, "", headers, ...rows].join("\r\n");
}

export function exportJson(report: BuiltReport): string {
  return JSON.stringify(
    {
      report: report.definition.id,
      title: report.definition.title,
      description: report.definition.description,
      level: report.definition.level,
      generatedAt: report.generatedAt,
      totals: report.totals,
      columns: report.definition.columns,
      rows: report.rows,
    },
    null,
    2,
  );
}

export function exportHtml(report: BuiltReport): string {
  const totals = Object.entries(report.totals)
    .map(([key, value]) => `<span><strong>${htmlEscape(key)}</strong>: ${htmlEscape(value)}</span>`)
    .join("");
  const headers = report.definition.columns.map((column) => `<th>${htmlEscape(column.label)}</th>`).join("");
  const rows = report.rows
    .map((row) => `<tr>${report.definition.columns.map((column) => `<td>${htmlEscape(row.values[column.key] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(report.definition.title)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:32px;color:#172033}h1{margin-bottom:4px}.muted{color:#667085}.totals{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0;padding:12px;background:#f2f4f7;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #e4e7ec;padding:10px;text-align:left;font-size:12px}th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.04em}@media print{body{margin:16px}.no-print{display:none}}
  </style>
</head>
<body>
  <p class="muted">ImobOps · Relatório</p>
  <h1>${htmlEscape(report.definition.title)}</h1>
  <p class="muted">${htmlEscape(report.definition.description)}</p>
  <p class="muted">Gerado em ${htmlEscape(report.generatedAt)}</p>
  <div class="totals">${totals || "<span>Sem totais agregados</span>"}</div>
  <table><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="${report.definition.columns.length}">Sem registros.</td></tr>`}</tbody></table>
  <p class="muted">Exportação HTML imprimível. Use o navegador para salvar como PDF.</p>
</body>
</html>`;
}

export function exportXls(report: BuiltReport): string {
  return exportHtml(report).replace(
    "<p class=\"muted\">Exportação HTML imprimível. Use o navegador para salvar como PDF.</p>",
    "<p class=\"muted\">Exportação XLS compatível com Excel.</p>",
  );
}

export async function exportXlsx(report: BuiltReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ImobOps";
  wb.created = new Date();

  const safeTitle = report.definition.title.slice(0, 31).replace(/[*?:\\/[\]<>|]/g, "");
  const ws = wb.addWorksheet(safeTitle || "Report");

  ws.addRow(["ImobOps", report.definition.title]);
  ws.addRow(["Gerado em", report.generatedAt]);
  ws.addRow([]);

  const headerRow = ws.addRow(report.definition.columns.map((c) => c.label));
  headerRow.font = { bold: true };

  for (const row of report.rows) {
    ws.addRow(report.definition.columns.map((c) => row.values[c.key] ?? ""));
  }

  if (Object.keys(report.totals).length > 0) {
    ws.addRow([]);
    const totalsRow = ws.addRow(Object.entries(report.totals).flat());
    totalsRow.font = { bold: true };
  }

  ws.columns = report.definition.columns.map((c) => ({
    width: Math.max(12, c.label.length * 1.5),
  }));

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function exportPdf(report: BuiltReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(10).fillColor("#667085").text("ImobOps · Relatório", { continued: false });
    doc.fillColor("#172033").fontSize(18).text(report.definition.title, { continued: false });
    doc.fontSize(10).fillColor("#667085").text(report.definition.description, { continued: false });
    doc.fontSize(9).fillColor("#667085").text(`Gerado em ${report.generatedAt}`, { continued: false });

    if (Object.keys(report.totals).length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#172033");
      for (const [key, val] of Object.entries(report.totals)) {
        doc.text(`${key}: ${val}`, { continued: false });
      }
    }

    doc.moveDown(1);

    const pageWidth = 495; // A4 at 72 DPI — 40 margins each side
    const colWidths = report.definition.columns.map(() => pageWidth / report.definition.columns.length);

    // Header row (bold with background)
    let yPos = doc.y;
    const headerHeight = 18;
    doc.rect(40, yPos, pageWidth, headerHeight).fill("#f2f4f7");
    doc.fillColor("#172033").fontSize(9);
    let xPos = 40;
    for (let i = 0; i < report.definition.columns.length; i++) {
      doc.text(report.definition.columns[i].label, xPos + 4, yPos + 4, {
        width: colWidths[i] - 8,
        align: report.definition.columns[i].align === "right" ? "right" : "left",
      });
      xPos += colWidths[i];
    }

    // Data rows
    doc.fontSize(8).fillColor("#172033");
    for (const row of report.rows) {
      yPos = doc.y + 4;
      if (yPos > 720) {
        doc.addPage();
        yPos = doc.y + 4;
      }

      xPos = 40;
      for (let i = 0; i < report.definition.columns.length; i++) {
        const val = row.values[report.definition.columns[i].key] ?? "";
        doc.text(String(val), xPos + 2, yPos, {
          width: colWidths[i] - 4,
          align: report.definition.columns[i].align === "right" ? "right" : "left",
        });
        xPos += colWidths[i];
      }
    }

    doc.end();
  });
}

export async function exportReport(report: BuiltReport, format: ReportFormat): Promise<string | Buffer> {
  if (format === "json") return exportJson(report);
  if (format === "html") return exportHtml(report);
  if (format === "xls") return exportXls(report);
  if (format === "xlsx") return exportXlsx(report);
  if (format === "pdf") return exportPdf(report);
  return exportCsv(report);
}
