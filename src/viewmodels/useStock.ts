import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/services/stockApi";

export const useStockItems = (group?: string) =>
  useQuery({
    queryKey: ["stock", "items", group],
    queryFn: () => stockApi.getItems(group),
  });

export const useStockGroups = () =>
  useQuery({
    queryKey: ["stock", "groups"],
    queryFn: stockApi.getGroups,
  });

export const useStockSummary = () =>
  useQuery({
    queryKey: ["stock", "summary"],
    queryFn: stockApi.getSummary,
  });
