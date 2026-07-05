import { Col, Row, Statistic, Card, Table, Tag } from "antd";
import { useStockSummary } from "@/viewmodels/useStock";
import { useTopMovers } from "@/viewmodels/useSales";
import { useReorderAlerts } from "@/viewmodels/useForecast";
import { useSalesByGroup } from "@/viewmodels/useSales";
import SalesTrendChart from "@/views/components/charts/SalesTrendChart";

export default function Dashboard() {
  const { data: summary } = useStockSummary();
  const { data: topMovers = [] } = useTopMovers(10);
  const { data: alerts = [] } = useReorderAlerts();
  const { data: groupSales = [] } = useSalesByGroup();

  const reorderCount = alerts.filter((a) => a.needs_reorder).length;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Items" value={summary?.total_items ?? "—"} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Stock Value"
              value={summary?.total_value ?? 0}
              prefix="₹"
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Low Stock"
              value={summary?.low_stock_count ?? "—"}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Reorder Needed"
              value={reorderCount}
              valueStyle={{ color: reorderCount > 0 ? "#cf1322" : "#3f8600" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="Sales by Group (Monthly)">
            <SalesTrendChart data={groupSales} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="Top 10 Movers">
            <Table
              size="small"
              dataSource={topMovers}
              rowKey="item"
              pagination={false}
              columns={[
                { title: "Item", dataIndex: "item", ellipsis: true },
                {
                  title: "Amount",
                  dataIndex: "total_amount",
                  render: (v: number) => `₹${v.toLocaleString("en-IN")}`,
                  align: "right",
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {reorderCount > 0 && (
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={
                <span>
                  Reorder Alerts{" "}
                  <Tag color="red">{reorderCount} items</Tag>
                </span>
              }
            >
              <Table
                size="small"
                dataSource={alerts.filter((a) => a.needs_reorder)}
                rowKey="item"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: "Item", dataIndex: "item" },
                  { title: "Group", dataIndex: "stock_group" },
                  { title: "Current Stock", dataIndex: "current_stock", align: "right" },
                  { title: "Reorder Point", dataIndex: "reorder_point", align: "right" },
                  { title: "Order Qty", dataIndex: "reorder_qty", align: "right" },
                ]}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
