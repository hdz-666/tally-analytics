import type { StockGroup } from "@/models/stock";
import type { TableProps, GetProp } from "antd";
import type { SorterResult } from "antd/es/table/interface";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  Card,
  Button,
  Row,
  Col,
  Table,
  Tag,
  Space,
  TreeSelect,
} from "antd";
import { PlayCircleOutlined, FileExcelOutlined } from "@ant-design/icons";
import { exportReorderAlertsXls } from "@/utils/exportXls";
import { useMonthlySales } from "@/viewmodels/useSales";
import {
  useForecastItems,
  useReorderAlerts,
  useRunForecast,
} from "@/viewmodels/useForecast";
import { useStockItems, useStockGroups } from "@/viewmodels/useStock";
import ForecastChart from "@/views/components/charts/ForecastChart";
import { ReorderAlert } from "@/models/forecast";
const HORIZON_OPTIONS = [
  { label: "3 months", value: 3 },
  { label: "6 months", value: 6 },
  { label: "9 months", value: 9 },
  { label: "12 months", value: 12 },
];
type TablePaginationConfig = Exclude<
  GetProp<TableProps, "pagination">,
  boolean
>;

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: SorterResult<any>["field"];
  sortOrder?: SorterResult<any>["order"];
  filters?: Parameters<GetProp<TableProps, "onChange">>[1];
}
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

export default function Forecast() {
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [selectedItem, setSelectedItem] = useState<string | undefined>();
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 15 },
  });
  const { data: groups = [] } = useStockGroups();
  const { data: stockItems = [] } = useStockItems(selectedGroup);
  const { data: actual = [] } = useMonthlySales(
    { item: selectedItem },
    !!selectedItem,
  );
  const { data: forecast = [] } = useForecastItems(selectedItem);
  const { data: alerts = [] } = useReorderAlerts();
  const runForecast = useRunForecast();

  // Reset selected item when group changes
  useEffect(() => {
    setSelectedItem(undefined);
  }, [selectedGroup]);

  const treeData = groups.map((g) => ({
    id: g.name,
    pId: g.parent ?? null,
    title: g.name,
    value: g.name,
  }));

  const itemOptions = stockItems.map((s) => ({ label: s.name, value: s.name }));

  // Compute descendant group set for alert filtering
  const descendantGroups = useMemo(
    () => (selectedGroup ? getDescendantGroups(groups, selectedGroup) : null),
    [groups, selectedGroup],
  );

  const filteredAlerts = descendantGroups
    ? alerts.filter((a) => a.stock_group && descendantGroups.has(a.stock_group))
    : alerts;

  const handleTableChange: TableProps<ReorderAlert>["onChange"] = (
    pagination,
    filters,
    sorter,
  ) => {
    const current = pagination.current ?? 1;
    const pageSize = pagination.pageSize ?? 10;

    setTableParams({
      pagination: { current, pageSize },
      filters,
      sortOrder: Array.isArray(sorter) ? undefined : sorter.order,
      sortField: Array.isArray(sorter) ? undefined : sorter.field,
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col>
          <Space wrap>
            <TreeSelect
              treeDataSimpleMode
              allowClear
              showSearch
              placeholder="Filter by group"
              style={{ width: 220 }}
              treeData={treeData}
              value={selectedGroup}
              onChange={setSelectedGroup}
              treeNodeFilterProp="title"
            />
            <Select
              showSearch
              allowClear
              placeholder="Select item to view forecast"
              style={{ width: 280 }}
              options={itemOptions}
              value={selectedItem}
              onChange={setSelectedItem}
            />
            <Select
              value={horizonMonths}
              onChange={setHorizonMonths}
              options={HORIZON_OPTIONS}
              style={{ width: 130 }}
            />
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={runForecast.isPending}
              onClick={() => runForecast.mutate(horizonMonths)}
            >
              Run Forecast
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              disabled={filteredAlerts.length === 0}
              onClick={() =>
                exportReorderAlertsXls(filteredAlerts, selectedGroup)
              }
            >
              Export XLS for reorder
            </Button>
          </Space>
        </Col>
      </Row>

      {selectedItem && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card>
              <ForecastChart
                actual={actual.filter((s) => s.item === selectedItem)}
                forecast={forecast.filter((f) => f.item === selectedItem)}
                item={selectedItem}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row>
        <Col span={24}>
          <Card
            title={
              selectedGroup
                ? `Reorder Alerts — ${selectedGroup}`
                : "All Reorder Alerts"
            }
          >
            <Table
              rowKey="item"
              dataSource={filteredAlerts}
              pagination={{
                pageSize: tableParams.pagination?.pageSize,
                current: tableParams.pagination?.current,
              }}
              onChange={handleTableChange}
              columns={[
                { title: "Item", dataIndex: "item" },
                { title: "Group", dataIndex: "stock_group" },
                {
                  title: "Current Stock",
                  dataIndex: "current_stock",
                  align: "right",
                  render: (v: number) => Number(v ?? 0).toFixed(2),
                },
                {
                  title: "Reorder Point",
                  dataIndex: "reorder_point",
                  align: "right",
                  render: (v: number) => Number(v ?? 0).toFixed(2),
                },
                {
                  title: "Order Qty",
                  dataIndex: "reorder_qty",
                  align: "right",
                  render: (v: number) => Number(v ?? 0).toFixed(2),
                },
                {
                  title: "Status",
                  dataIndex: "needs_reorder",
                  filters: [
                    { text: "Order Now", value: true },
                    { text: "OK", value: false },
                  ],
                  onFilter: (value, record) => record.needs_reorder === value,
                  render: (v: boolean) =>
                    v ? (
                      <Tag color="red">Order Now</Tag>
                    ) : (
                      <Tag color="green">OK</Tag>
                    ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
