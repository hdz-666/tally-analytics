import { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, DatePicker, Select, Space, Table, TreeSelect, Typography, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import ReactECharts from "echarts-for-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  useSalesByArea,
  useAreaClients,
  useClientItems,
  usePincodeSales,
} from "@/viewmodels/useSalesArea";
import { useStockItems, useStockGroups } from "@/viewmodels/useStock";
import type { StockGroup } from "@/models/stock";
import type { AreaSales as AreaSalesRow, AreaClient, ClientItem } from "@/models/salesArea";
import type { AreaSalesFilters } from "@/services/salesAreaApi";

const fmt = (v: number) =>
  v >= 1e5
    ? `₹${(v / 1e5).toFixed(1)}L`
    : `₹${new Intl.NumberFormat("en-IN").format(v)}`;

const qtyFmt = (v: number) => new Intl.NumberFormat("en-IN").format(v);

const MP_CENTER: [number, number] = [23.4734, 77.9479];

const RESOLUTION_LABEL: Record<AreaSalesRow["resolution_level"], string> = {
  pincode: "Precise (pincode)",
  town: "Approximate (town)",
  state: "Coarse (state-level only)",
};

const RESOLUTION_OPACITY: Record<AreaSalesRow["resolution_level"], number> = {
  pincode: 0.85,
  town: 0.65,
  state: 0.4,
};

// Single-hue sequential ramp (magnitude encoding) — light to dark blue,
// matching the app's existing primary blue (#1677ff).
function blueShade(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const from = { r: 145, g: 202, b: 255 }; // antd blue-3
  const to = { r: 9, g: 88, b: 217 }; // antd blue-7
  const r = Math.round(from.r + (to.r - from.r) * clamped);
  const g = Math.round(from.g + (to.g - from.g) * clamped);
  const b = Math.round(from.b + (to.b - from.b) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

type FilterParams = AreaSalesFilters | undefined;

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

// Recenters/zooms the map when the sales team picks a specific city — a plain
// child so it can read the map instance via react-leaflet's context.
function FlyToArea({ target }: { target: AreaSalesRow | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], 11, { duration: 0.75 });
    else map.flyTo(MP_CENTER, 6, { duration: 0.75 });
  }, [target, map]);
  return null;
}

function ClientItemsTable({ partyName, dateParams }: { partyName: string; dateParams: FilterParams }) {
  const { data = [], isLoading } = useClientItems(partyName, dateParams);

  const columns: ColumnsType<ClientItem> = [
    { title: "Product", dataIndex: "item" },
    { title: "Category", dataIndex: "stock_group", render: (v: string | null) => v ?? "—" },
    { title: "Qty Sold", dataIndex: "sold_qty", align: "right", render: qtyFmt },
    {
      title: "Sales Value",
      dataIndex: "sold_amount",
      align: "right",
      render: fmt,
      sorter: (a, b) => a.sold_amount - b.sold_amount,
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Table
      size="small"
      loading={isLoading}
      rowKey="item"
      dataSource={data}
      pagination={false}
      columns={columns}
    />
  );
}

function AreaClientsTable({ area, dateParams }: { area: string; dateParams: FilterParams }) {
  const { data = [], isLoading } = useAreaClients(area, dateParams);

  const columns: ColumnsType<AreaClient> = [
    { title: "Client", dataIndex: "party_name" },
    { title: "Products", dataIndex: "item_count", align: "right" },
    { title: "Qty Sold", dataIndex: "sold_qty", align: "right", render: qtyFmt },
    {
      title: "Sales Value",
      dataIndex: "sold_amount",
      align: "right",
      render: fmt,
      sorter: (a, b) => a.sold_amount - b.sold_amount,
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Table
      size="small"
      loading={isLoading}
      rowKey="party_name"
      dataSource={data}
      pagination={false}
      columns={columns}
      expandable={{
        expandedRowRender: (client) => (
          <ClientItemsTable partyName={client.party_name} dateParams={dateParams} />
        ),
      }}
    />
  );
}

export default function AreaSales() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([
    dayjs().subtract(23, "month").startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [selectedItem, setSelectedItem] = useState<string | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<string | undefined>();
  const [selectedPincode, setSelectedPincode] = useState<string | undefined>();
  const [selectedArea, setSelectedArea] = useState<string | undefined>();

  const { data: stockItems = [] } = useStockItems();
  const { data: stockGroups = [] } = useStockGroups();

  // A selected category rolls up all its descendant sub-categories too (e.g.
  // picking "Plywood" also includes every sub-grade under it) — same pattern
  // as the category filter on the Sales page.
  const descendantGroups = useMemo(
    () => (selectedGroup ? getDescendantGroups(stockGroups, selectedGroup) : null),
    [stockGroups, selectedGroup],
  );

  const dateParams = useMemo(() => {
    const range = dateRange
      ? {
          from_date: dateRange[0].format("YYYY-MM-DD"),
          to_date: dateRange[1].endOf("month").format("YYYY-MM-DD"),
        }
      : {};
    return {
      ...range,
      item: selectedItem,
      stock_group: descendantGroups ? [...descendantGroups] : undefined,
      pincode: selectedPincode,
    } as FilterParams;
  }, [dateRange, selectedItem, descendantGroups, selectedPincode]);

  const { data: areas = [], isLoading } = useSalesByArea(dateParams);

  // Deliberately excludes the currently selected pincode so the dropdown
  // keeps offering the full set of options rather than collapsing to one.
  const pincodeQueryParams = useMemo(() => {
    if (!dateParams) return undefined;
    const { pincode: _pincode, ...rest } = dateParams;
    return rest;
  }, [dateParams]);
  const { data: pincodes = [] } = usePincodeSales(pincodeQueryParams);
  const pincodeOptions = useMemo(
    () =>
      [...pincodes]
        .sort((a, b) => b.sold_amount - a.sold_amount)
        .map((p) => ({
          value: p.pincode,
          label: `${p.pincode} — ${p.area}${p.state ? `, ${p.state}` : ""}`,
        })),
    [pincodes],
  );

  const areaOptions = useMemo(
    () =>
      [...areas]
        .sort((a, b) => b.sold_amount - a.sold_amount)
        .map((a) => ({
          value: a.area,
          label: `${a.area}${a.state ? ` (${a.state})` : ""} — ${a.client_count} client${a.client_count === 1 ? "" : "s"}`,
        })),
    [areas],
  );

  // Filtering by area is a client-side narrow of the already-fetched list —
  // the sales team picks their territory and the map/histogram/table all
  // update to just that city/district, no extra request needed.
  const filteredAreas = useMemo(
    () => (selectedArea ? areas.filter((a) => a.area === selectedArea) : areas),
    [areas, selectedArea],
  );

  const selectedAreaRow = useMemo(
    () => areas.find((a) => a.area === selectedArea),
    [areas, selectedArea],
  );

  // Marker size/color scale stays anchored to the full (unfiltered) set so a
  // selected city's bubble doesn't jump to "maximum" just because it's alone.
  const maxAmount = useMemo(
    () => areas.reduce((max, a) => Math.max(max, a.sold_amount), 1),
    [areas],
  );

  const markerRadius = (amount: number) => 6 + 26 * Math.sqrt(amount / maxAmount);

  const top20 = useMemo(
    () => [...filteredAreas].sort((a, b) => b.sold_amount - a.sold_amount).slice(0, 20),
    [filteredAreas],
  );

  const histogramOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        formatter: (params: any[]) =>
          `${params[0].axisValue}<br/>${params[0].marker}${fmt(params[0].value)}`,
      },
      grid: { left: 60, right: 20, top: 20, bottom: 100 },
      xAxis: {
        type: "category",
        data: top20.map((a) => a.area),
        axisLabel: { rotate: 45, interval: 0, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (v: number) => (v >= 1e5 ? `${(v / 1e5).toFixed(0)}L` : String(v)),
        },
      },
      series: [
        {
          type: "bar",
          data: top20.map((a) => a.sold_amount),
          itemStyle: { color: "#1677ff" },
          label: { show: true, position: "top", formatter: (p: any) => fmt(p.value), fontSize: 10 },
        },
      ],
    }),
    [top20],
  );

  const columns: ColumnsType<AreaSalesRow> = [
    { title: "Area", dataIndex: "area" },
    {
      title: "Confidence",
      dataIndex: "resolution_level",
      render: (level: AreaSalesRow["resolution_level"]) => {
        const color = level === "pincode" ? "green" : level === "town" ? "gold" : "default";
        return <Tag color={color}>{RESOLUTION_LABEL[level]}</Tag>;
      },
      filters: [
        { text: RESOLUTION_LABEL.pincode, value: "pincode" },
        { text: RESOLUTION_LABEL.town, value: "town" },
        { text: RESOLUTION_LABEL.state, value: "state" },
      ],
      onFilter: (value, record) => record.resolution_level === value,
    },
    { title: "Clients", dataIndex: "client_count", align: "right" },
    { title: "Qty Sold", dataIndex: "sold_qty", align: "right", render: qtyFmt },
    {
      title: "Sales Value",
      dataIndex: "sold_amount",
      align: "right",
      render: fmt,
      sorter: (a, b) => a.sold_amount - b.sold_amount,
      defaultSortOrder: "descend",
    },
  ];

  const groupTreeData = stockGroups.map((g) => ({
    id: g.name,
    pId: g.parent ?? null,
    title: g.name,
    value: g.name,
  }));

  const filters = (
    <Space wrap>
      <Select
        allowClear
        showSearch
        placeholder="All areas / cities"
        style={{ width: 240 }}
        value={selectedArea}
        onChange={setSelectedArea}
        options={areaOptions}
        optionFilterProp="label"
      />
      <Select
        allowClear
        showSearch
        placeholder="Search by pincode"
        style={{ width: 240 }}
        value={selectedPincode}
        onChange={setSelectedPincode}
        options={pincodeOptions}
        optionFilterProp="label"
      />
      <TreeSelect
        treeDataSimpleMode
        allowClear
        showSearch
        placeholder="All categories"
        style={{ width: 220 }}
        treeData={groupTreeData}
        value={selectedGroup}
        onChange={setSelectedGroup}
        treeNodeFilterProp="title"
      />
      <Select
        allowClear
        showSearch
        placeholder="All products"
        style={{ width: 240 }}
        value={selectedItem}
        onChange={setSelectedItem}
        options={stockItems.map((i) => ({ value: i.name, label: i.name }))}
        optionFilterProp="label"
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
          <Card title="Sales by Area" extra={filters}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
              Bubble size and color show sales value per area. Areas resolved only
              at town or state level (see the Confidence column below) are an
              approximation — most parties don't have a pincode on file.
            </Typography.Paragraph>
            <MapContainer
              center={MP_CENTER}
              zoom={6}
              style={{ height: 480, width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FlyToArea target={selectedAreaRow} />
              {filteredAreas.map((a) => (
                <CircleMarker
                  key={a.area}
                  center={[a.lat, a.lon]}
                  radius={markerRadius(a.sold_amount)}
                  pathOptions={{
                    color: blueShade(a.sold_amount / maxAmount),
                    fillColor: blueShade(a.sold_amount / maxAmount),
                    fillOpacity: RESOLUTION_OPACITY[a.resolution_level],
                    opacity: RESOLUTION_OPACITY[a.resolution_level],
                    dashArray: a.resolution_level === "state" ? "4 3" : undefined,
                  }}
                >
                  <LeafletTooltip>
                    <strong>{a.area}</strong>
                    <br />
                    {fmt(a.sold_amount)} · {a.client_count} client{a.client_count === 1 ? "" : "s"}
                    <br />
                    {RESOLUTION_LABEL[a.resolution_level]}
                  </LeafletTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </Card>
        </Col>

        <Col span={24}>
          <Card title={selectedArea ? `${selectedArea} — Sales Value` : "Top 20 Areas by Sales Value"}>
            <ReactECharts option={histogramOption} notMerge style={{ height: 360 }} />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="Area → Client → Product Drill-down" extra={filters}>
            <Table
              loading={isLoading}
              rowKey="area"
              dataSource={filteredAreas}
              columns={columns}
              expandable={{
                expandedRowRender: (area) => (
                  <AreaClientsTable area={area.area} dateParams={dateParams} />
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
