import ReactECharts from "echarts-for-react";
import type { GroupSales } from "@/models/sales";
import dayjs from "dayjs";

interface Props {
  data: GroupSales[];
}

export default function SalesTrendChart({ data }: Props) {
  const groups = [...new Set(data.map((d) => d.stock_group))];
  const months = [...new Set(data.map((d) => dayjs(d.month).format("MMM YY")))];

  const series = groups.map((group) => ({
    name: group,
    type: "bar" as const,
    stack: "total",
    data: months.map((m) => {
      const row = data.find(
        (d) => d.stock_group === group && dayjs(d.month).format("MMM YY") === m
      );
      return row ? row.sold_amount : 0;
    }),
  }));

  const option = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 30, type: "scroll" },
    grid: { left: 60, right: 20, top: 20, bottom: 80 },
    xAxis: { type: "category", data: months, axisLabel: { rotate: 45 } },
    yAxis: { type: "value", name: "₹ Amount" },
    dataZoom: [
      { type: "inside", xAxisIndex: 0 },
      { type: "slider", xAxisIndex: 0, bottom: 8, height: 18 },
    ],
    series,
  };

  return <ReactECharts option={option} style={{ height: 420 }} />;
}
