import { useState } from "react";
import { Card, Tag, TreeSelect } from "antd";
import { ProTable } from "@ant-design/pro-components";
import { useStockItems, useStockGroups } from "@/viewmodels/useStock";
import type { StockItem } from "@/models/stock";

export default function Inventory() {
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const { data: groups = [] } = useStockGroups();
  const { data: items = [], isLoading } = useStockItems(selectedGroup);

  const treeData = groups.map((g) => ({
    id: g.name,
    pId: g.parent ?? null,
    title: g.name,
    value: g.name,
  }));

  return (
    <div style={{ padding: 24 }}>
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
        <ProTable<StockItem>
          rowKey="name"
          loading={isLoading}
          dataSource={items}
          search={false}
          toolBarRender={false}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: "Item", dataIndex: "name", sorter: (a, b) => a.name.localeCompare(b.name) },
            { title: "Group", dataIndex: "stock_group" },
            {
              title: "Stock",
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
              title: "Rate",
              dataIndex: "closing_rate",
              align: "right",
              render: (_: unknown, record: StockItem) =>
                `₹${Number(record.closing_rate ?? 0).toLocaleString("en-IN")}`,
            },
            {
              title: "Value",
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
