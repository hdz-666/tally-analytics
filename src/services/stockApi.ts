import api from "./api";
import type { StockItem, StockGroup, StockSummary } from "@/models/stock";

export const stockApi = {
  getItems: (group?: string) =>
    api.get<StockItem[]>("/stock/items", { params: { group } }).then((r) => r.data),

  getGroups: () =>
    api.get<StockGroup[]>("/stock/groups").then((r) => r.data),

  getSummary: () =>
    api.get<StockSummary>("/stock/summary").then((r) => r.data),
};
