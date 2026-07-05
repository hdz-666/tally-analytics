import api from "./api";
import type { ForecastPoint, ReorderAlert, ForecastRunResponse } from "@/models/forecast";

export const forecastApi = {
  getForecast: (item?: string) =>
    api.get<ForecastPoint[]>("/forecast/items", { params: { item } }).then((r) => r.data),

  getReorderAlerts: () =>
    api.get<ReorderAlert[]>("/forecast/reorder-alerts").then((r) => r.data),

  runForecast: (horizonMonths: number) =>
    api
      .post<ForecastRunResponse>("/forecast/run", null, {
        params: { horizon_months: horizonMonths },
      })
      .then((r) => r.data),
};
