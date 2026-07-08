import api from "./api";
import type { MonthlySales, GroupSales, TopMover } from "@/models/sales";

export const salesApi = {
  getMonthlySales: (params?: { item?: string; from_date?: string; to_date?: string }) =>
    api.get<MonthlySales[]>("/sales/monthly", { params }).then((r) => r.data),

  getSalesByGroup: (params?: { from_date?: string; to_date?: string }) =>
    api.get<GroupSales[]>("/sales/by-group", { params }).then((r) => r.data),

  getTopMovers: (
    limit = 20,
    params?: { from_date?: string; to_date?: string; stock_group?: string },
  ) =>
    api
      .get<TopMover[]>("/sales/top-movers", { params: { limit, ...params } })
      .then((r) => r.data),
};
