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
  useAreaPincodes,
} from "@/viewmodels/useSalesArea";
import { useStockItems, useStockGroups } from "@/viewmodels/useStock";
import type { StockGroup } from "@/models/stock";
import type {
  AreaSales as AreaSalesRow,
  AreaClient,
  ClientItem,
  PincodeSales,
} from "@/models/salesArea";
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

interface MapPoint {
  key: string;
  label: string;
  area: string;
  lat: number;
  lon: number;
  sold_amount: number;
  client_count: number;
  confidence: AreaSalesRow["resolution_level"];
  kind: "pincode" | "residual";
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

// Pincode-level breakdown within one city — sits between the city total and
// its clients so the sales team can see which locality to target. Cities
// resolved only at town/state level have no pincode rows at all, in which
// case this falls straight back to the client list instead of showing an
// empty table.
function AreaPincodesTable({ area, dateParams }: { area: string; dateParams: FilterParams }) {
  const { data = [], isLoading } = useAreaPincodes(area, dateParams);

  if (!isLoading && data.length === 0) {
    return <AreaClientsTable area={area} dateParams={dateParams} />;
  }

  const columns: ColumnsType<PincodeSales> = [
    { title: "Pincode", dataIndex: "pincode" },
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

  return (
    <Table
      size="small"
      loading={isLoading}
      rowKey="pincode"
      dataSource={data}
      pagination={false}
      columns={columns}
      expandable={{
        expandedRowRender: (pin) => (
          <AreaClientsTable
            area={area}
            dateParams={{ ...dateParams, pincode: pin.pincode }}
          />
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

  // The area/city picker is a client-side narrow on top of whatever the
  // server-side filters (pincode/product/category/date) already returned.
  // If those change and the selected city drops out of the result — e.g. a
  // picked pincode belongs to a different city than the one still selected
  // here — silently clear it instead of filtering everything down to
  // nothing on the map/table.
  useEffect(() => {
    if (selectedArea && areas.length > 0 && !areas.some((a) => a.area === selectedArea)) {
      setSelectedArea(undefined);
    }
  }, [areas, selectedArea]);

  const filteredAreas = useMemo(
    () => (selectedArea ? areas.filter((a) => a.area === selectedArea) : areas),
    [areas, selectedArea],
  );

  const selectedAreaRow = useMemo(
    () => areas.find((a) => a.area === selectedArea),
    [areas, selectedArea],
  );

  // The map plots one dot per pincode (real segregation within a city)
  // instead of one blob per city. Whatever a city's total doesn't tie back
  // to a specific pincode (most parties are only resolved to town/state
  // level) gets a single "other addresses" dot at the city's own point, so
  // the dots for a city still sum to that city's true total — nothing is
  // silently dropped from the map.
  const mapPoints = useMemo<MapPoint[]>(() => {
    // A specific pincode is already a single point server-side (by-area is
    // filtered to it) — no need to reconstruct pincode/residual dots.
    if (selectedPincode) {
      return filteredAreas.map((a) => ({
        key: `area:${a.area}`,
        label: `${selectedPincode} (${a.area})`,
        area: a.area,
        lat: a.lat,
        lon: a.lon,
        sold_amount: a.sold_amount,
        client_count: a.client_count,
        confidence: a.resolution_level,
        kind: "pincode",
      }));
    }

    const scopedPincodes = selectedArea
      ? pincodes.filter((p) => p.area === selectedArea)
      : pincodes;

    const pincodeTotalByArea = new Map<string, number>();
    for (const p of scopedPincodes) {
      pincodeTotalByArea.set(p.area, (pincodeTotalByArea.get(p.area) ?? 0) + p.sold_amount);
    }

    const pincodePoints: MapPoint[] = scopedPincodes.map((p) => ({
      key: `pincode:${p.pincode}`,
      label: `${p.pincode} (${p.area})`,
      area: p.area,
      lat: p.lat,
      lon: p.lon,
      sold_amount: p.sold_amount,
      client_count: p.client_count,
      confidence: "pincode",
      kind: "pincode",
    }));

    const residualPoints: MapPoint[] = filteredAreas.flatMap((a) => {
      const pinTotal = pincodeTotalByArea.get(a.area) ?? 0;
      const residual = a.sold_amount - pinTotal;
      if (residual <= 1) return [];
      return [
        {
          key: `residual:${a.area}`,
          label: pinTotal > 0 ? `${a.area} — other addresses` : a.area,
          area: a.area,
          lat: a.lat,
          lon: a.lon,
          sold_amount: residual,
          client_count: a.client_count,
          confidence: pinTotal > 0 ? ("town" as const) : a.resolution_level,
          kind: "residual" as const,
        },
      ];
    });

    return [...pincodePoints, ...residualPoints];
  }, [pincodes, filteredAreas, selectedArea, selectedPincode]);

  // Marker size/color scale is anchored to the full (unfiltered) point set so
  // a selected city/pincode's dot doesn't jump to "maximum" just because
  // it's alone on screen.
  const maxAmount = useMemo(
    () => mapPoints.reduce((max, p) => Math.max(max, p.sold_amount), 1),
    [mapPoints],
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
              Each dot is one pincode, sized and colored by its sales value —
              a city with several dots close together means sales spread
              across multiple localities there. A dashed "other addresses"
              dot picks up whatever sales in that city aren't tied to a
              specific pincode, so every city's dots still add up to its true
              total. Select a city or search a pincode below to zoom in.
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
              {mapPoints.map((p) => (
                <CircleMarker
                  key={p.key}
                  center={[p.lat, p.lon]}
                  radius={markerRadius(p.sold_amount)}
                  pathOptions={{
                    color: blueShade(p.sold_amount / maxAmount),
                    fillColor: blueShade(p.sold_amount / maxAmount),
                    fillOpacity: RESOLUTION_OPACITY[p.confidence],
                    opacity: RESOLUTION_OPACITY[p.confidence],
                    dashArray: p.kind === "residual" ? "4 3" : undefined,
                  }}
                >
                  <LeafletTooltip>
                    <strong>{p.label}</strong>
                    <br />
                    {fmt(p.sold_amount)} · {p.client_count} client{p.client_count === 1 ? "" : "s"}
                    <br />
                    {RESOLUTION_LABEL[p.confidence]}
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
          <Card title="Area → Pincode → Client → Product Drill-down" extra={filters}>
            <Table
              loading={isLoading}
              rowKey="area"
              dataSource={filteredAreas}
              columns={columns}
              expandable={{
                expandedRowRender: (area) => (
                  <AreaPincodesTable area={area.area} dateParams={dateParams} />
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
