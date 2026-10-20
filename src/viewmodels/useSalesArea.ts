import { useQuery } from "@tanstack/react-query";
import { salesAreaApi } from "@/services/salesAreaApi";
import type { AreaSalesFilters } from "@/services/salesAreaApi";

export const useSalesByArea = (params?: AreaSalesFilters) =>
  useQuery({
    queryKey: ["sales", "by-area", params],
    queryFn: () => salesAreaApi.getSalesByArea(params),
  });

export const useAreaClients = (
  area: string | undefined,
  params?: AreaSalesFilters,
  enabled = true,
) =>
  useQuery({
    queryKey: ["sales", "by-area", area, "clients", params],
    queryFn: () => salesAreaApi.getAreaClients(area as string, params),
    enabled: enabled && !!area,
  });

export const useClientItems = (
  partyName: string | undefined,
  params?: { from_date?: string; to_date?: string },
  enabled = true,
) =>
  useQuery({
    queryKey: ["sales", "clients", partyName, "items", params],
    queryFn: () => salesAreaApi.getClientItems(partyName as string, params),
    enabled: enabled && !!partyName,
  });

export const usePincodeSales = (params?: Omit<AreaSalesFilters, "pincode">) =>
  useQuery({
    queryKey: ["sales", "pincodes", params],
    queryFn: () => salesAreaApi.getPincodes(params),
  });

export const useAreaPincodes = (
  area: string | undefined,
  params?: Omit<AreaSalesFilters, "pincode">,
  enabled = true,
) =>
  useQuery({
    queryKey: ["sales", "by-area", area, "pincodes", params],
    queryFn: () => salesAreaApi.getAreaPincodes(area as string, params),
    enabled: enabled && !!area,
  });
