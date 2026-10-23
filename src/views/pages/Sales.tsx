import { useState, useMemo } from "react";
import { Card, Row, Col, DatePicker, Space, TreeSelect, Statistic, Tooltip } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
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

  // KPI metrics for the selected group (or all groups) over the selected range
  const kpis = useMemo(() => {
    const byMonth = new Map<string, number>();
    const byItem = new Map<string, number>();
    let totalAmount = 0;
    let totalQty = 0;
    for (const row of filteredMonthly) {
      const m = dayjs(row.month).format("YYYY-MM");
      byMonth.set(m, (byMonth.get(m) ?? 0) + row.sold_amount);
      byItem.set(row.item, (byItem.get(row.item) ?? 0) + row.sold_amount);
      totalAmount += row.sold_amount;
      totalQty += row.sold_qty;
    }
    const overallAmount = allMonthly.reduce((sum, r) => sum + r.sold_amount, 0);

    const months = [...byMonth.keys()].sort();
    const lastKey = months[months.length - 1];
    const prevKey = months[months.length - 2];
    const lastAmount = lastKey ? byMonth.get(lastKey)! : 0;
    const prevAmount = prevKey ? byMonth.get(prevKey)! : 0;
    const momPct = prevAmount > 0 ? ((lastAmount - prevAmount) / prevAmount) * 100 : null;

    const bestMonth = [...byMonth.entries()].sort((a, b) => b[1] - a[1])[0];
    const topItem = [...byItem.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      totalAmount,
      totalQty,
      avgMonthly: months.length ? totalAmount / months.length : 0,
      sharePct: overallAmount > 0 ? (totalAmount / overallAmount) * 100 : 0,
      lastLabel: lastKey ? dayjs(lastKey).format("MMM YY") : "—",
      prevLabel: prevKey ? dayjs(prevKey).format("MMM YY") : null,
      lastAmount,
      momPct,
      bestMonth: bestMonth
        ? { label: dayjs(bestMonth[0]).format("MMM YY"), amount: bestMonth[1] }
        : null,
      topItem: topItem
        ? { name: topItem[0], amount: topItem[1], pct: totalAmount > 0 ? (topItem[1] / totalAmount) * 100 : 0 }
        : null,
      activeItems: byItem.size,
    };
  }, [filteredMonthly, allMonthly]);

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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={selectedGroup ? `Total Sales — ${selectedGroup}` : "Total Sales"}
              value={fmt(kpis.totalAmount)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Quantity Sold" value={kpis.totalQty} precision={0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Avg Monthly Sales" value={fmt(Math.round(kpis.avgMonthly))} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Share of All Sales"
              value={kpis.sharePct}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                kpis.prevLabel
                  ? `${kpis.lastLabel} Sales (vs ${kpis.prevLabel})`
                  : `${kpis.lastLabel} Sales`
              }
              value={fmt(kpis.lastAmount)}
              suffix={
                kpis.momPct !== null && (
                  <span
                    style={{
                      fontSize: 14,
                      marginLeft: 8,
                      color: kpis.momPct >= 0 ? "#3f8600" : "#cf1322",
                    }}
                  >
                    {kpis.momPct >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(kpis.momPct).toFixed(1)}%
                  </span>
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={kpis.bestMonth ? `Best Month (${kpis.bestMonth.label})` : "Best Month"}
              value={kpis.bestMonth ? fmt(kpis.bestMonth.amount) : "—"}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={
                kpis.topItem
                  ? `Top Item (${kpis.topItem.pct.toFixed(1)}% of sales)`
                  : "Top Item"
              }
              value={kpis.topItem?.name ?? "—"}
              formatter={(v) => (
                <Tooltip title={String(v)}>
                  <div
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: 18,
                    }}
                  >
                    {v}
                  </div>
                </Tooltip>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Items Sold" value={kpis.activeItems} />
          </Card>
        </Col>
      </Row>

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
