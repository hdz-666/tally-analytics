import { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Tabs,
  Input,
  Button,
  DatePicker,
  Statistic,
  Tooltip,
  Progress,
  Space,
  Typography,
  Badge,
} from "antd";
import {
  ReloadOutlined,
  InfoCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import ReactECharts from "echarts-for-react";
import type { TableProps } from "antd";
import { useLedgerHealth, useAgingSummary, usePnlMonthly, useRefreshLedger } from "@/viewmodels/useLedger";
import type { LedgerHealth, PnlMonthly } from "@/models/ledger";

const { Text } = Typography;

const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

const fmtCr = (v: number) => {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${fmt(v)}`;
};

const ragColor: Record<string, string> = {
  green: "success",
  amber: "warning",
  red: "error",
};

const ragLabel: Record<string, string> = {
  green: "Healthy",
  amber: "At Risk",
  red: "Critical",
};

const bucketLabel: Record<string, string> = {
  credit: "Credit",
  current: "Current",
  "1_30": "1–30d",
  "31_60": "31–60d",
  "60plus": "60d+",
};

const bucketColor: Record<string, string> = {
  credit: "purple",
  current: "green",
  "1_30": "gold",
  "31_60": "orange",
  "60plus": "red",
};

// ECharts colors matching the Tag colors above
const agingPieColors = ["#722ed1", "#52c41a", "#fadb14", "#fa8c16", "#ff4d4f"];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <InfoCircleOutlined style={{ marginLeft: 6, color: "#8c8c8c", fontSize: 12 }} />
    </Tooltip>
  );
}

// ─── Ledger Health Tab ────────────────────────────────────────────────────────

function LedgerHealthTab() {
  const { data: rows = [], isLoading } = useLedgerHealth();
  const { data: aging } = useAgingSummary();
  const refresh = useRefreshLedger();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        r.customer.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding_amount, 0);
  const overdueCount = rows.filter((r) => r.has_overdue).length;
  const avgDso =
    rows.filter((r) => r.dso_estimate !== null).length > 0
      ? rows
          .filter((r) => r.dso_estimate !== null)
          .reduce((s, r) => s + (r.dso_estimate ?? 0), 0) /
        rows.filter((r) => r.dso_estimate !== null).length
      : 0;
  const totalRevenue12m = rows.reduce((s, r) => s + r.revenue_12m, 0);

  const columns: TableProps<LedgerHealth>["columns"] = [
    {
      title: "Customer",
      dataIndex: "customer",
      sorter: (a, b) => a.customer.localeCompare(b.customer),
      width: 200,
    },
    {
      title: (
        <span>
          Outstanding
          <InfoTip text="Amount this customer owes you. Negative (Cr) means you owe them — they've overpaid or have an advance." />
        </span>
      ),
      dataIndex: "outstanding_amount",
      align: "right",
      sorter: (a, b) => a.outstanding_amount - b.outstanding_amount,
      defaultSortOrder: "descend",
      render: (v: number) =>
        v < 0 ? (
          <Tooltip title="Credit balance — you owe this customer money">
            <Text strong type="success">
              ₹{fmt(-v)} Cr
            </Text>
          </Tooltip>
        ) : (
          <Text strong>₹{fmt(v)}</Text>
        ),
    },
    {
      title: (
        <span>
          Credit Days
          <InfoTip text="Number of days the customer is allowed before payment is due" />
        </span>
      ),
      dataIndex: "credit_days",
      align: "right",
      width: 110,
      render: (v: number) => `${v}d`,
    },
    {
      title: (
        <span>
          DSO
          <InfoTip text="Days Sales Outstanding — estimated days to collect payment. Formula: (Outstanding ÷ Annual Revenue) × 365. Lower is better. If DSO > Credit Days, money is being collected late." />
        </span>
      ),
      dataIndex: "dso_estimate",
      align: "right",
      width: 90,
      sorter: (a, b) => (a.dso_estimate ?? 999) - (b.dso_estimate ?? 999),
      render: (v: number | null, r: LedgerHealth) => {
        if (v === null) return <Text type="secondary">—</Text>;
        const over = v > r.credit_days;
        return (
          <Text type={over ? "danger" : "success"}>
            {Math.round(v)}d
          </Text>
        );
      },
    },
    {
      title: (
        <span>
          Last Receipt
          <InfoTip text="Date of most recent payment received from this customer" />
        </span>
      ),
      dataIndex: "last_receipt_date",
      width: 120,
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString("en-IN") : <Text type="secondary">Never</Text>,
    },
    {
      title: (
        <span>
          Overdue
          <InfoTip text="Flagged overdue if outstanding balance exists AND no payment received within the agreed credit period" />
        </span>
      ),
      dataIndex: "has_overdue",
      width: 100,
      filters: [
        { text: "Overdue", value: true },
        { text: "Current", value: false },
      ],
      onFilter: (val, r) => r.has_overdue === val,
      render: (v: boolean) =>
        v ? <Tag color="red">Overdue</Tag> : <Tag color="green">Current</Tag>,
    },
    {
      title: (
        <span>
          Aging
          <InfoTip text="How overdue this customer is. Current = within credit terms. 1–30d / 31–60d / 60d+ = days past due. Credit = they've overpaid." />
        </span>
      ),
      dataIndex: "aging_bucket",
      width: 100,
      filters: [
        { text: "Credit", value: "credit" },
        { text: "Current", value: "current" },
        { text: "1–30d", value: "1_30" },
        { text: "31–60d", value: "31_60" },
        { text: "60d+", value: "60plus" },
      ],
      onFilter: (val, r) => r.aging_bucket === val,
      render: (v: string, r: LedgerHealth) => (
        <Tag color={bucketColor[v]}>
          {bucketLabel[v]}{r.overdue_days > 0 ? ` (${r.overdue_days}d)` : ""}
        </Tag>
      ),
    },
    {
      title: (
        <span>
          Health Score
          <InfoTip text="Composite score 0–100. Components: DSO ratio (30), Aging bucket (25 → 15 → 6 → 0 by severity), Credit-term recency (20), Engagement (15), Balance ratio (10). Higher = healthier." />
        </span>
      ),
      dataIndex: "health_score",
      width: 160,
      sorter: (a, b) => a.health_score - b.health_score,
      render: (v: number, r: LedgerHealth) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <Progress
            percent={v}
            size="small"
            strokeColor={
              r.health_rag === "green"
                ? "#52c41a"
                : r.health_rag === "amber"
                ? "#faad14"
                : "#ff4d4f"
            }
            format={(p) => `${p}`}
          />
        </Space>
      ),
    },
    {
      title: (
        <span>
          Status
          <InfoTip text="Green ≥ 70 (good payer) | Amber 40–69 (watch) | Red < 40 (high risk)" />
        </span>
      ),
      dataIndex: "health_rag",
      width: 100,
      filters: [
        { text: "Healthy", value: "green" },
        { text: "At Risk", value: "amber" },
        { text: "Critical", value: "red" },
      ],
      onFilter: (val, r) => r.health_rag === val,
      render: (v: string) => (
        <Badge status={ragColor[v] as any} text={ragLabel[v]} />
      ),
    },
  ];

  const expandedRow = (r: LedgerHealth) => (
    <Row gutter={16} style={{ padding: "8px 0" }}>
      <Col span={4}>
        <Statistic title="Total Invoiced" value={`₹${fmt(r.total_invoiced)}`} />
      </Col>
      <Col span={4}>
        <Statistic title="Total Received" value={`₹${fmt(r.total_received)}`} />
      </Col>
      <Col span={4}>
        <Statistic title="No. of Invoices" value={r.total_invoices} />
      </Col>
      <Col span={4}>
        <Statistic title="No. of Receipts" value={r.total_receipts} />
      </Col>
      <Col span={4}>
        <Statistic
          title="12M Revenue"
          value={`₹${fmt(r.revenue_12m)}`}
        />
      </Col>
      <Col span={4}>
        <Statistic
          title="Days Since Receipt"
          value={r.days_since_last_receipt >= 999 ? "Never" : `${r.days_since_last_receipt}d`}
        />
      </Col>
      <Col span={4}>
        <Statistic
          title="Days Overdue"
          value={r.overdue_days > 0 ? `${r.overdue_days}d` : "—"}
          valueStyle={{ color: r.overdue_days > 0 ? "#cf1322" : undefined }}
        />
      </Col>
      <Col span={24} style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Score breakdown — DSO: {r.score_dso} | Aging: {r.score_aging} | Recency: {r.score_recency} | Engagement: {r.score_engagement} | Balance: {r.score_balance_ratio}
        </Text>
      </Col>
    </Row>
  );

  return (
    <div>
      {/* Legend */}
      <Card
        size="small"
        style={{ marginBottom: 16, background: "#fafafa" }}
        bordered={false}
      >
        <Space size={24} wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Badge color="#52c41a" /> <strong>Green (≥70)</strong> — Pays on time, low risk
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Badge color="#faad14" /> <strong>Amber (40–69)</strong> — Watch this customer, payments slowing
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Badge color="#ff4d4f" /> <strong>Red (&lt;40)</strong> — High risk, overdue or rarely pays
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined /> Click any row to see score breakdown
          </Text>
        </Space>
      </Card>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  Total Outstanding
                  <InfoTip text="Sum of all unpaid balances across all customers" />
                </span>
              }
              value={fmtCr(totalOutstanding)}
              valueStyle={{ color: totalOutstanding > 0 ? "#cf1322" : "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  Overdue Customers
                  <InfoTip text="Number of customers who haven't paid within their agreed credit period" />
                </span>
              }
              value={overdueCount}
              suffix={`/ ${rows.length}`}
              valueStyle={{ color: overdueCount > 0 ? "#cf1322" : "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  Avg DSO
                  <InfoTip text="Average Days Sales Outstanding across all customers. Compare to your typical credit period — if higher, collections are slow." />
                </span>
              }
              value={Math.round(avgDso)}
              suffix="days"
              valueStyle={{ color: avgDso > 45 ? "#cf1322" : "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  Revenue (12M)
                  <InfoTip text="Total revenue billed to customers in the last 12 months" />
                </span>
              }
              value={fmtCr(totalRevenue12m)}
            />
          </Card>
        </Col>
      </Row>

      {/* DSO / ADD stats + Aging donut */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  Portfolio DSO
                  <InfoTip text="(Total AR ÷ 12M Revenue) × 365. Days of revenue tied up in unpaid invoices across your entire customer base." />
                </span>
              }
              value={aging?.portfolio_dso != null ? `${aging.portfolio_dso}d` : "—"}
              valueStyle={{ color: (aging?.portfolio_dso ?? 0) > 45 ? "#cf1322" : "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  Best Possible DSO
                  <InfoTip text="(Current AR only ÷ 12M Revenue) × 365. What your DSO would be if no one was late — a baseline for how low DSO can realistically go." />
                </span>
              }
              value={aging?.best_possible_dso != null ? `${aging.best_possible_dso}d` : "—"}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={
                <span>
                  ADD (Delinquency)
                  <InfoTip text="Average Days Delinquent = Portfolio DSO − Best Possible DSO. Days lost purely to late payment. Zero means everyone pays exactly on time; higher means collections are slipping." />
                </span>
              }
              value={aging?.add_days != null ? `${aging.add_days}d` : "—"}
              valueStyle={{ color: (aging?.add_days ?? 0) > 15 ? "#cf1322" : "#3f8600" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ height: "100%" }}>
            <ReactECharts
              style={{ height: 100 }}
              option={{
                tooltip: {
                  trigger: "item",
                  formatter: (p: any) => `${p.name}: ₹${fmt(p.value)} (${p.percent}%)`,
                },
                color: agingPieColors,
                series: [
                  {
                    type: "pie",
                    radius: ["45%", "70%"],
                    data: aging
                      ? [
                          { name: "Credit", value: aging.credit_balance },
                          { name: "Current", value: aging.current_ar },
                          { name: "1–30d", value: aging.overdue_1_30 },
                          { name: "31–60d", value: aging.overdue_31_60 },
                          { name: "60d+", value: aging.overdue_60plus },
                        ].filter((d) => d.value > 0)
                      : [],
                    label: { show: false },
                    emphasis: { label: { show: false } },
                  },
                ],
              }}
            />
            <div style={{ textAlign: "center", fontSize: 11, color: "#8c8c8c", marginTop: -8 }}>
              AR Aging Mix
            </div>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title="Customer Ledger Health"
        extra={
          <Space>
            <Input
              prefix={<SearchOutlined />}
              placeholder="Search customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Tooltip title="Re-compute from latest Tally data (runs a database refresh)">
              <Button
                icon={<ReloadOutlined />}
                loading={refresh.isPending}
                onClick={() => refresh.mutate()}
              >
                Refresh
              </Button>
            </Tooltip>
          </Space>
        }
      >
        <Table
          rowKey="customer"
          dataSource={filtered}
          columns={columns}
          loading={isLoading}
          expandable={{ expandedRowRender: expandedRow }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}

// ─── P&L Tab ─────────────────────────────────────────────────────────────────

function PnlTab() {
  const { data: rows = [], isLoading } = usePnlMonthly();

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(23, "month").startOf("month"),
    dayjs().endOf("month"),
  ]);

  const filteredRows = useMemo(() => {
    if (!dateRange) return rows;
    const startStr = dateRange[0].startOf("month").format("YYYY-MM-DD");
    const endStr = dateRange[1].endOf("month").format("YYYY-MM-DD");
    return rows.filter((r) => r.month >= startStr && r.month <= endStr);
  }, [rows, dateRange]);

  const months = filteredRows.map((r) =>
    new Date(r.month).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
  );

  const chartOption = {
    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) =>
        params
          .map((p: any) => `${p.marker}${p.seriesName}: ₹${fmt(p.value)}`)
          .join("<br/>"),
    },
    legend: {
      data: ["Revenue", "COGS", "Gross Profit", "Net Profit"],
      bottom: 30,
    },
    grid: { left: 70, right: 20, top: 20, bottom: 80 },
    xAxis: {
      type: "category",
      data: months,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) =>
          v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v),
      },
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0 },
      { type: "slider", xAxisIndex: 0, bottom: 8, height: 18 },
    ],
    series: [
      {
        name: "Revenue",
        type: "bar",
        data: filteredRows.map((r) => r.revenue),
        itemStyle: { color: "#1677ff" },
      },
      {
        name: "COGS",
        type: "bar",
        data: filteredRows.map((r) => r.cogs),
        itemStyle: { color: "#ff7875" },
      },
      {
        name: "Gross Profit",
        type: "bar",
        data: filteredRows.map((r) => r.gross_profit),
        itemStyle: { color: "#73d13d" },
      },
      {
        name: "Net Profit",
        type: "line",
        data: filteredRows.map((r) => r.net_profit),
        lineStyle: { color: "#9254de", width: 2 },
        itemStyle: { color: "#9254de" },
        symbol: "circle",
      },
    ],
  };

  const columns: TableProps<PnlMonthly>["columns"] = [
    {
      title: "Month",
      dataIndex: "month",
      render: (v: string) =>
        new Date(v).toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    },
    {
      title: (
        <span>
          Revenue
          <InfoTip text="Total billed to customers this month (from Company B sales)" />
        </span>
      ),
      dataIndex: "revenue",
      align: "right",
      render: (v: number) => `₹${fmt(v)}`,
    },
    {
      title: (
        <span>
          COGS
          <InfoTip text="Cost of Goods Sold — purchase cost from Company A (what you paid to buy the goods)" />
        </span>
      ),
      dataIndex: "cogs",
      align: "right",
      render: (v: number) => `₹${fmt(v)}`,
    },
    {
      title: (
        <span>
          Gross Profit
          <InfoTip text="Revenue minus COGS. This is your profit before counting transport, labor, and loan costs." />
        </span>
      ),
      dataIndex: "gross_profit",
      align: "right",
      render: (v: number) => (
        <Text type={v >= 0 ? "success" : "danger"}>₹{fmt(v)}</Text>
      ),
    },
    {
      title: (
        <span>
          GM%
          <InfoTip text="Gross Margin % — what % of revenue is left after buying the goods. Higher is better." />
        </span>
      ),
      dataIndex: "gross_margin_pct",
      align: "right",
      render: (v: number | null) =>
        v !== null ? (
          <Text type={v >= 0 ? "success" : "danger"}>{v.toFixed(1)}%</Text>
        ) : (
          "—"
        ),
    },
    {
      title: (
        <span>
          Overheads
          <InfoTip text="Fixed costs (transport, labor, etc.) + monthly loan interest" />
        </span>
      ),
      dataIndex: "total_overhead",
      align: "right",
      render: (v: number) => `₹${fmt(v)}`,
    },
    {
      title: (
        <span>
          Net Profit
          <InfoTip text="Gross Profit minus all overheads. This is your bottom line for the month." />
        </span>
      ),
      dataIndex: "net_profit",
      align: "right",
      render: (v: number) => (
        <Text strong type={v >= 0 ? "success" : "danger"}>
          ₹{fmt(v)}
        </Text>
      ),
    },
    {
      title: (
        <span>
          NM%
          <InfoTip text="Net Margin % — what % of revenue is actual profit after all costs." />
        </span>
      ),
      dataIndex: "net_margin_pct",
      align: "right",
      render: (v: number | null) =>
        v !== null ? (
          <Text type={v >= 0 ? "success" : "danger"}>{v.toFixed(1)}%</Text>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div>
      {/* Legend */}
      <Card
        size="small"
        style={{ marginBottom: 16, background: "#fafafa" }}
        bordered={false}
      >
        <Space size={24} wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span style={{ color: "#1677ff" }}>■</span> <strong>Revenue</strong> — Total billed to customers
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span style={{ color: "#ff7875" }}>■</span> <strong>COGS</strong> — Purchase cost (Company A)
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span style={{ color: "#73d13d" }}>■</span> <strong>Gross Profit</strong> — Revenue − COGS
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <span style={{ color: "#9254de" }}>—</span> <strong>Net Profit</strong> — After transport, labor, and loan costs
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined /> Add fixed costs &amp; loans via Supabase → tallypnl.manual_costs / loan_config
          </Text>
        </Space>
      </Card>

      <Row justify="end" style={{ marginBottom: 8 }}>
        <DatePicker.RangePicker
          picker="month"
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setDateRange([dates[0], dates[1]]);
            } else {
              setDateRange(null);
            }
          }}
          allowClear
        />
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <ReactECharts option={chartOption} notMerge style={{ height: 400 }} />
      </Card>

      <Card title="Monthly P&L Breakdown">
        <Table
          rowKey="month"
          dataSource={[...filteredRows].reverse()}
          columns={columns}
          loading={isLoading}
          pagination={{ pageSize: 24, showSizeChanger: true }}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Ledger() {
  return (
    <div style={{ padding: 24 }}>
      <Tabs
        defaultActiveKey="health"
        items={[
          {
            key: "health",
            label: "Ledger Health",
            children: <LedgerHealthTab />,
          },
          {
            key: "pnl",
            label: "P&L",
            children: <PnlTab />,
          },
        ]}
      />
    </div>
  );
}
