import { useQuery } from "@tanstack/react-query";
import { salesApi } from "@/services/salesApi";

export const useMonthlySales = (
  params?: { item?: string; from_date?: string; to_date?: string },
  enabled = true,
) =>
  useQuery({
    queryKey: ["sales", "monthly", params],
    queryFn: () => salesApi.getMonthlySales(params),
    enabled,
  });

export const useSalesByGroup = (params?: { from_date?: string; to_date?: string }) =>
  useQuery({
    queryKey: ["sales", "by-group", params],
    queryFn: () => salesApi.getSalesByGroup(params),
  });

export const useTopMovers = (limit = 20) =>
  useQuery({
    queryKey: ["sales", "top-movers", limit],
    queryFn: () => salesApi.getTopMovers(limit),
  });
