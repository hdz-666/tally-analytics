import api from "./api";
import type { AreaSales, AreaClient, ClientItem, PincodeSales } from "@/models/salesArea";

export interface AreaSalesFilters {
  from_date?: string;
  to_date?: string;
  item?: string;
  stock_group?: string[];
  pincode?: string;
}

export const salesAreaApi = {
  getSalesByArea: (params?: AreaSalesFilters) =>
    api.get<AreaSales[]>("/sales/by-area", { params }).then((r) => r.data),

  getAreaClients: (area: string, params?: AreaSalesFilters) =>
    api
      .get<AreaClient[]>(`/sales/by-area/${encodeURIComponent(area)}/clients`, { params })
      .then((r) => r.data),

  getClientItems: (
    partyName: string,
    params?: { from_date?: string; to_date?: string },
  ) =>
    api
      .get<ClientItem[]>(`/sales/clients/${encodeURIComponent(partyName)}/items`, { params })
      .then((r) => r.data),

  getPincodes: (params?: Omit<AreaSalesFilters, "pincode">) =>
    api.get<PincodeSales[]>("/sales/pincodes", { params }).then((r) => r.data),

  getAreaPincodes: (area: string, params?: Omit<AreaSalesFilters, "pincode">) =>
    api
      .get<PincodeSales[]>(`/sales/by-area/${encodeURIComponent(area)}/pincodes`, { params })
      .then((r) => r.data),
};
