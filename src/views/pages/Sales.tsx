import { useState, useMemo } from "react";
import { Card, Row, Col, DatePicker, Space, TreeSelect } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import ReactECharts from "echarts-for-react";
import { useSalesByGroup, useMonthlySales } from "@/viewmodels/useSales";
import { useStockGroups } from "@/viewmodels/useStock";
import type { StockGroup } from "@/models/stock";
import SalesTrendChart from "@/views/components/charts/SalesTrendChart";

const fmt = (v: number) =>
  v >= 1e5
    ? `₹${(v / 1e5).toFixed(1)}L`
    : `₹${new Intl.NumberFormat("en-IN").format(v)}`;

function getDescendantGroups(groups: StockGroup[], root: string): Set<string> {
  const set = new Set<string>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const g of groups) {
      if (g.parent && set.has(g.parent) && !set.has(g.name)) {
        set.add(g.name);
        grew = true;
      }
    }
  }
  return set;
}

export default function Sales() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(23, "month").startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();

  const { data: groups = [] } = useStockGroups();

  const dateParams = useMemo(() => {
    if (!dateRange) return undefined;
    return {
      from_date: dateRange[0].format("YYYY-MM-DD"),
      to_date: dateRange[1].endOf("month").format("YYYY-MM-DD"),
    };
  }, [dateRange]);

  const { data: groupSales = [] } = useSalesByGroup(dateParams);
  const { data: allMonthly = [] } = useMonthlySales(dateParams);

  // Descendant groups for client-side filtering
  const descendantGroups = useMemo(
    () => (selectedGroup ? getDescendantGroups(groups, selectedGroup) : null),
    [groups, selectedGroup]
  );

  const filteredGroupSales = useMemo(
    () =>
      descendantGroups
        ? groupSales.filter((d) => descendantGroups.has(d.stock_group))
        : groupSales,
    [groupSales, descendantGroups]
  );

  const filteredMonthly = useMemo(
    () =>
      descendantGroups
        ? allMonthly.filter((d) => d.stock_group && descendantGroups.has(d.stock_group))
        : allMonthly,
    [allMonthly, descendantGroups]
  );

  // Top 30 items by total sales — used for both the trend chart and the bar chart
  const top30 = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of filteredMonthly) {
      totals.set(row.item, (totals.get(row.item) ?? 0) + row.sold_amount);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([item, total_amount]) => ({ item, total_amount }));
  }, [filteredMonthly]);

  const topTrendItems = useMemo(() => top30.map((r) => r.item), [top30]);

  const trendMonths = useMemo(
    () =>
      [...new Set(filteredMonthly.map((d) => dayjs(d.month).format("MMM YY")))].sort(
        (a, b) => dayjs(a, "MMM YY").valueOf() - dayjs(b, "MMM YY").valueOf()
      ),
    [filteredMonthly]
  );

  const trendOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        formatter: (params: any[]) =>
          [
            params[0].axisValue,
            ...params.map((p: any) => `${p.marker}${p.seriesName}: ${fmt(p.value ?? 0)}`),
          ].join("<br/>"),
      },
      legend: { type: "scroll", bottom: 30 },
      grid: { left: 70, right: 20, top: 20, bottom: 80 },
      xAxis: { type: "category", data: trendMonths, axisLabel: { rotate: 45 } },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (v: number) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v)),
        },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "slider", xAxisIndex: 0, bottom: 8, height: 18 },
      ],
      series: topTrendItems.map((item) => ({
        name: item,
        type: "line",
        smooth: true,
        data: trendMonths.map((m) => {
          const row = filteredMonthly.find(
            (d) => d.item === item && dayjs(d.month).format("MMM YY") === m
          );
          return row ? row.sold_amount : 0;
        }),
      })),
    }),
    [trendMonths, topTrendItems, filteredMonthly]
  );

  const topMoverOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        formatter: (params: any[]) =>
          `${params[0].axisValue}<br/>${params[0].marker}${fmt(params[0].value)}`,
      },
      grid: { left: 60, right: 20, top: 20, bottom: 100 },
      xAxis: {
        type: "category",
        data: top30.map((m) => m.item),
        axisLabel: { rotate: 45, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (v: number) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v)),
        },
      },
      dataZoom: [
        { type: "inside", xAxisIndex: 0 },
        { type: "slider", xAxisIndex: 0, bottom: 8, height: 18 },
      ],
      series: [
        {
          type: "bar",
          data: top30.map((m) => m.total_amount),
          itemStyle: { color: "#1677ff" },
          label: {
            show: true,
            position: "top",
            formatter: (p: any) => fmt(p.value),
            fontSize: 10,
          },
        },
      ],
    }),
    [top30]
  );

  const treeData = groups.map((g) => ({
    id: g.name,
    pId: g.parent ?? null,
    title: g.name,
    value: g.name,
  }));

  const filters = (
    <Space wrap>
      <TreeSelect
        treeDataSimpleMode
        allowClear
        showSearch
        placeholder="All categories"
        style={{ width: 220 }}
        treeData={treeData}
        value={selectedGroup}
        onChange={setSelectedGroup}
        treeNodeFilterProp="title"
      />
      <DatePicker.RangePicker
        picker="month"
        value={dateRange}
        onChange={(dates) => {
          if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]);
          else setDateRange(null);
        }}
        allowClear
      />
    </Space>
  );

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="Sales Trend by Group" extra={filters}>
            <SalesTrendChart data={filteredGroupSales} />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Monthly Sales Trend — Top 30 Items" extra={filters}>
            <ReactECharts option={trendOption} notMerge style={{ height: 400 }} />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Top 30 Moving Items (by Value)" extra={filters}>
            <ReactECharts option={topMoverOption} notMerge style={{ height: 360 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
