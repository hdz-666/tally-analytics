import * as XLSX from "xlsx";
import type { ReorderAlert } from "@/models/forecast";

export function exportReorderAlertsXls(
  alerts: ReorderAlert[],
  groupLabel?: string,
) {
  const rows = alerts.map((a) => ({
    Item: a.item,
    Group: a.stock_group ?? "",
    "Current Stock": Math.ceil(a.current_stock),
    "Reorder Point": Math.ceil(a.reorder_point),
    "Order Qty": Math.ceil(a.reorder_qty),
    Status: a.needs_reorder ? "Order Now" : "OK",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 40 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = groupLabel ? groupLabel.slice(0, 31) : "Reorder Alerts";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().slice(0, 10);
  const suffix = groupLabel ? `_${groupLabel.replace(/[^a-z0-9]/gi, "_")}` : "";
  XLSX.writeFile(wb, `reorder_alerts${suffix}_${today}.xlsx`);
}
