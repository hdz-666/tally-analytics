import { Card, Row, Col } from "antd";
import { useSalesByGroup, useTopMovers } from "@/viewmodels/useSales";
import SalesTrendChart from "@/views/components/charts/SalesTrendChart";
import ReactECharts from "echarts-for-react";

export default function Sales() {
  const { data: groupSales = [] } = useSalesByGroup();
  const { data: topMovers = [] } = useTopMovers(15);

  const topMoverOption = {
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: topMovers.map((m) => m.item),
      axisLabel: { rotate: 45, interval: 0 },
    },
    yAxis: { type: "value", name: "₹ Amount" },
    series: [
      {
        type: "bar",
        data: topMovers.map((m) => m.total_amount),
        itemStyle: { color: "#1677ff" },
      },
    ],
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Sales Trend by Group">
            <SalesTrendChart data={groupSales} />
          </Card>
        </Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card title="Top Moving Items (by Value)">
            <ReactECharts option={topMoverOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
