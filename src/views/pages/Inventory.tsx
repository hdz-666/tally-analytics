import type { TableProps, GetProp } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import type { StockItem } from "@/models/stock";

import { useState } from "react";
import { Card, Tag, TreeSelect, Table, Tooltip, Space, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useStockItems, useStockGroups } from "@/viewmodels/useStock";

const { Text } = Typography;

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <InfoCircleOutlined style={{ marginLeft: 6, color: "#8c8c8c", fontSize: 12 }} />
    </Tooltip>
  );
}

type TablePaginationConfig = Exclude<
  GetProp<TableProps, "pagination">,
  boolean
>;

interface TableParams {
  pagination?: TablePaginationConfig;
  sortField?: SorterResult<StockItem>["field"];
  sortOrder?: SorterResult<StockItem>["order"];
  filters?: Parameters<GetProp<TableProps, "onChange">>[1];
}

export default function Inventory() {
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: { current: 1, pageSize: 15 },
  });

  const { data: groups = [] } = useStockGroups();
  const { data: items = [], isLoading } = useStockItems(selectedGroup);

  const treeData = groups.map((g) => ({
    id: g.name,
    pId: g.parent ?? null,
    title: g.name,
    value: g.name,
  }));

  const handleTableChange: TableProps<StockItem>["onChange"] = (
    pagination,
    filters,
    sorter,
  ) => {
    setTableParams({
      pagination: {
        current: pagination.current ?? 1,
        pageSize: pagination.pageSize ?? 15,
      },
      filters,
      sortOrder: Array.isArray(sorter) ? undefined : sorter.order,
      sortField: Array.isArray(sorter) ? undefined : sorter.field,
    });
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Legend */}
      <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }} bordered={false}>
        <Space size={24} wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Tag color="red" style={{ marginRight: 4 }}>0</Tag> Out of stock — reorder immediately
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Tag color="orange" style={{ marginRight: 4 }}>&lt;10</Tag> Low stock — consider reordering
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <Tag color="green" style={{ marginRight: 4 }}>OK</Tag> Sufficient stock
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <InfoCircleOutlined /> Use the group filter to drill into a product category
          </Text>
        </Space>
      </Card>

      <Card
        title="Current Stock"
        extra={
          <TreeSelect
            treeDataSimpleMode
            allowClear
            showSearch
            placeholder="Filter by group"
            style={{ width: 240 }}
            treeData={treeData}
            value={selectedGroup}
            onChange={setSelectedGroup}
            treeNodeFilterProp="title"
          />
        }
      >
        <Table<StockItem>
          rowKey="name"
          loading={isLoading}
          dataSource={items}
          pagination={{
            current: tableParams.pagination?.current,
            pageSize: tableParams.pagination?.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "50", "100"],
          }}
          onChange={handleTableChange}
          columns={[
            {
              title: "Item",
              dataIndex: "name",
              sorter: (a, b) => a.name.localeCompare(b.name),
            },
            {
              title: "Group",
              dataIndex: "stock_group",
              sorter: (a, b) =>
                (a.stock_group ?? "").localeCompare(b.stock_group ?? ""),
            },
            {
              title: (
                <span>
                  Stock
                  <InfoTip text="Current quantity in hand as per Tally closing balance. Red = out of stock, Orange = low (< 10 units), Green = sufficient." />
                </span>
              ),
              dataIndex: "closing_balance",
              align: "right",
              sorter: (a, b) => a.closing_balance - b.closing_balance,
              render: (_: unknown, record: StockItem) => {
                const v = record.closing_balance;
                return (
                  <Tag color={v <= 0 ? "red" : v < 10 ? "orange" : "green"}>
                    {v.toLocaleString("en-IN")}
                  </Tag>
                );
              },
            },
            {
              title: (
                <span>
                  Rate
                  <InfoTip text="Closing average cost rate per unit from Tally" />
                </span>
              ),
              dataIndex: "closing_rate",
              align: "right",
              sorter: (a, b) => a.closing_rate - b.closing_rate,
              render: (_: unknown, record: StockItem) =>
                `₹${Number(record.closing_rate ?? 0).toLocaleString("en-IN")}`,
            },
            {
              title: (
                <span>
                  Value
                  <InfoTip text="Total inventory value = Stock × Rate. Represents capital tied up in this item." />
                </span>
              ),
              dataIndex: "closing_value",
              align: "right",
              sorter: (a, b) => a.closing_value - b.closing_value,
              render: (_: unknown, record: StockItem) =>
                `₹${Number(record.closing_value ?? 0).toLocaleString("en-IN")}`,
            },
          ]}
        />
      </Card>
    </div>
  );
}
