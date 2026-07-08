import type { TableProps, GetProp } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import type { StockItem } from "@/models/stock";

import { useState } from "react";
import { Card, Tag, TreeSelect, Table } from "antd";
import { useStockItems, useStockGroups } from "@/viewmodels/useStock";

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
              sorter: (a, b) => a.closing_rate - b.closing_rate,
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
