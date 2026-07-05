import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { forecastApi } from "@/services/forecastApi";
import { message } from "antd";

export const useForecastItems = (item?: string) =>
  useQuery({
    queryKey: ["forecast", "items", item],
    queryFn: () => forecastApi.getForecast(item),
    enabled: !!item,
  });

export const useReorderAlerts = () =>
  useQuery({
    queryKey: ["forecast", "reorder-alerts"],
    queryFn: forecastApi.getReorderAlerts,
  });

export const useRunForecast = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (horizonMonths: number) =>
      forecastApi.runForecast(horizonMonths),
    onSuccess: (data) => {
      message.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["forecast"], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["stock", "summary"], refetchType: "active" });
    },
    onError: () => message.error("Forecast run failed."),
  });
};
