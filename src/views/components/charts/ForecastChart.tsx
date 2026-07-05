import ReactECharts from "echarts-for-react";
import type { ForecastPoint } from "@/models/forecast";
import type { MonthlySales } from "@/models/sales";
import dayjs from "dayjs";

interface Props {
  actual: MonthlySales[];
  forecast: ForecastPoint[];
  item: string;
}

export default function ForecastChart({ actual, forecast, item }: Props) {
  const sortedActual = [...actual].sort((a, b) =>
    dayjs(a.month).unix() - dayjs(b.month).unix()
  );
  const sortedForecast = [...forecast].sort((a, b) =>
    dayjs(a.forecast_month).unix() - dayjs(b.forecast_month).unix()
  );

  const actualMonths = sortedActual.map((d) => dayjs(d.month).format("MMM YY"));
  const actualQty = sortedActual.map((d) => d.sold_qty);

  const forecastMonths = sortedForecast.map((d) => dayjs(d.forecast_month).format("MMM YY"));
  const forecastQty = sortedForecast.map((d) => d.forecast_qty);
  const lower = sortedForecast.map((d) => d.lower_bound);
  const upper = sortedForecast.map((d) => d.upper_bound);

  const allMonths = [...actualMonths, ...forecastMonths];

  const option = {
    title: { text: item, left: "center", textStyle: { fontSize: 14 } },
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, data: ["Actual", "Forecast", "Confidence Band"] },
    xAxis: { type: "category", data: allMonths, axisLabel: { rotate: 45 } },
    yAxis: { type: "value", name: "Qty" },
    series: [
      {
        name: "Actual",
        type: "bar",
        data: [...actualQty, ...Array(forecastMonths.length).fill(null)],
        itemStyle: { color: "#1677ff" },
      },
      {
        name: "Forecast",
        type: "line",
        data: [...Array(actualMonths.length).fill(null), ...forecastQty],
        lineStyle: { type: "dashed", color: "#ff7a45" },
        itemStyle: { color: "#ff7a45" },
        symbol: "circle",
      },
      {
        name: "Confidence Band",
        type: "line",
        data: [...Array(actualMonths.length).fill(null), ...upper],
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0.15, color: "#ff7a45" },
        stack: "band",
        symbol: "none",
      },
      {
        name: "Confidence Band",
        type: "line",
        data: [...Array(actualMonths.length).fill(null), ...lower],
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0, color: "#fff" },
        stack: "band",
        symbol: "none",
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 320 }} />;
}
