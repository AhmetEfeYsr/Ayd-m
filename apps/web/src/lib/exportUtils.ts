"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Export data rows as PDF with Turkish-friendly auto-table
 */
export function exportPDF(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
  filename: string = "rapor"
) {
  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, 18);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Oluşturulma: ${new Date().toLocaleString("tr-TR")}`, 14, 26);

  // Table
  autoTable(doc, {
    startY: 32,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? "-"))),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 250] },
    margin: { left: 14, right: 14 },
  });

  // Summary footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Sayfa ${i} / ${pageCount}  •  Toplam ${rows.length} kayıt`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}

/**
 * Export data rows as XLSX (Excel)
 */
export function exportExcel(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
  filename: string = "rapor"
) {
  // Header row
  const wsData = [columns.map((c) => c.header)];

  // Data rows
  rows.forEach((row) => {
    wsData.push(columns.map((c) => row[c.key] ?? ""));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width || 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31)); // Sheet name max 31 chars
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
