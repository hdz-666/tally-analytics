import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReorderAlert } from "@/models/forecast";

// Mock xlsx before importing the module under test
vi.mock("xlsx", () => {
  const mockSheet = { "!cols": [] as unknown[] };
  return {
    utils: {
      json_to_sheet: vi.fn().mockReturnValue(mockSheet),
      book_new: vi.fn().mockReturnValue({}),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  };
});

import * as XLSX from "xlsx";
import { exportReorderAlertsXls } from "@/utils/exportXls";

const makeAlert = (overrides: Partial<ReorderAlert> = {}): ReorderAlert => ({
  item: "Widget A",
  stock_group: "Electronics",
  current_stock: 10.3,
  reorder_point: 15.7,
  reorder_qty: 29.9,
  needs_reorder: true,
  ...overrides,
});

describe("exportReorderAlertsXls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Row mapping ─────────────────────────────────────────────────────────

  it("maps alert fields to correct column headers", () => {
    exportReorderAlertsXls([makeAlert()]);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({
      Item: "Widget A",
      Group: "Electronics",
      Status: "Order Now",
    });
  });

  it("applies Math.ceil to Current Stock, Reorder Point, and Order Qty", () => {
    exportReorderAlertsXls([makeAlert()]);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows[0]["Current Stock"]).toBe(11);  // ceil(10.3)
    expect(rows[0]["Reorder Point"]).toBe(16);  // ceil(15.7)
    expect(rows[0]["Order Qty"]).toBe(30);       // ceil(29.9)
  });

  it("maps needs_reorder=true to 'Order Now'", () => {
    exportReorderAlertsXls([makeAlert({ needs_reorder: true })]);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows[0]["Status"]).toBe("Order Now");
  });

  it("maps needs_reorder=false to 'OK'", () => {
    exportReorderAlertsXls([makeAlert({ needs_reorder: false })]);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows[0]["Status"]).toBe("OK");
  });

  it("converts null stock_group to empty string via ??", () => {
    // Backend can return null even though the TS type says string
    const alertWithNullGroup = makeAlert({
      stock_group: null as unknown as string,
    });
    exportReorderAlertsXls([alertWithNullGroup]);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows[0]["Group"]).toBe("");
  });

  it("produces one row per alert", () => {
    exportReorderAlertsXls([makeAlert(), makeAlert({ item: "Gadget B" })]);
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
  });

  it("handles empty alerts array without throwing", () => {
    expect(() => exportReorderAlertsXls([])).not.toThrow();
    const rows = vi.mocked(XLSX.utils.json_to_sheet).mock
      .calls[0][0] as Record<string, unknown>[];
    expect(rows).toHaveLength(0);
  });

  // ── Sheet name ──────────────────────────────────────────────────────────

  it("uses 'Reorder Alerts' as sheet name when no groupLabel provided", () => {
    exportReorderAlertsXls([makeAlert()]);
    expect(vi.mocked(XLSX.utils.book_append_sheet)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Reorder Alerts",
    );
  });

  it("uses groupLabel as sheet name when provided", () => {
    exportReorderAlertsXls([makeAlert()], "Electronics");
    expect(vi.mocked(XLSX.utils.book_append_sheet)).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "Electronics",
    );
  });

  it("truncates sheet name to 31 characters for long groupLabels", () => {
    exportReorderAlertsXls([makeAlert()], "A".repeat(40));
    const sheetName = vi.mocked(XLSX.utils.book_append_sheet).mock.calls[0][2] as string;
    expect(sheetName.length).toBeLessThanOrEqual(31);
  });

  // ── Filename ────────────────────────────────────────────────────────────

  it("uses default filename format when no groupLabel", () => {
    exportReorderAlertsXls([makeAlert()]);
    const filename = vi.mocked(XLSX.writeFile).mock.calls[0][1] as string;
    expect(filename).toMatch(/^reorder_alerts_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("includes sanitized groupLabel in filename", () => {
    exportReorderAlertsXls([makeAlert()], "Electronics");
    const filename = vi.mocked(XLSX.writeFile).mock.calls[0][1] as string;
    expect(filename).toMatch(/^reorder_alerts_Electronics_\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("sanitizes special characters in filename", () => {
    exportReorderAlertsXls([makeAlert()], "Group/Name (Test)");
    const filename = vi.mocked(XLSX.writeFile).mock.calls[0][1] as string;
    expect(filename).not.toMatch(/[/() ]/);
  });

  // ── Workbook structure ──────────────────────────────────────────────────

  it("sets 6 column widths on the sheet", () => {
    exportReorderAlertsXls([makeAlert()]);
    const sheet = vi.mocked(XLSX.utils.json_to_sheet).mock.results[0]
      .value as { "!cols": unknown[] };
    expect(sheet["!cols"]).toHaveLength(6);
  });

  it("calls writeFile exactly once", () => {
    exportReorderAlertsXls([makeAlert()]);
    expect(vi.mocked(XLSX.writeFile)).toHaveBeenCalledOnce();
  });

  it("calls book_new to create a workbook", () => {
    exportReorderAlertsXls([makeAlert()]);
    expect(vi.mocked(XLSX.utils.book_new)).toHaveBeenCalledOnce();
  });
});
