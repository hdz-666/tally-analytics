import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import * as echarts from "echarts";
import SalesTrendChart from "@/views/components/charts/SalesTrendChart";
import ForecastChart from "@/views/components/charts/ForecastChart";

// Capture the option each chart builds, then render it with the real echarts
// (SVG server-side renderer — jsdom has no canvas) to catch options that the
// installed echarts version rejects or mis-renders.
const captured: { option: any; notMerge?: boolean }[] = [];

vi.mock("echarts-for-react", () => ({
  default: (props: { option: unknown; notMerge?: boolean }) => {
    captured.push({ option: props.option, notMerge: props.notMerge });
    return null;
  },
}));

function renderSvg(option: unknown): string {
  const chart = echarts.init(null, null, {
    renderer: "svg",
    ssr: true,
    width: 800,
    height: 400,
  });
  chart.setOption(option as echarts.EChartsOption);
  const svg = chart.renderToSVGString();
  chart.dispose();
  return svg;
}

// zrender probes for a canvas to measure text and falls back to estimates;
// stub it so jsdom doesn't log "not implemented" for every render.
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

const lastOption = () => captured[captured.length - 1].option;

describe("SalesTrendChart", () => {
  beforeEach(() => {
    captured.length = 0;
  });

  const data = [
    { month: "2024-02-01", stock_group: "Tools", sold_qty: 5, sold_amount: 700 },
    { month: "2024-01-01", stock_group: "Electronics", sold_qty: 10, sold_amount: 1000 },
    { month: "2024-02-01", stock_group: "Electronics", sold_qty: 8, sold_amount: 900 },
  ];

  it("builds one stacked series per group with months in date order", () => {
    render(<SalesTrendChart data={data} />);
    const option = lastOption();
    expect(option.xAxis.data).toEqual(["Jan 24", "Feb 24"]);
    expect(option.series.map((s: any) => s.name)).toEqual(["Tools", "Electronics"]);
    expect(option.series[0].data).toEqual([0, 700]);
    expect(option.series[1].data).toEqual([1000, 900]);
  });

  it("replaces rather than merges options so the legend follows filters", () => {
    render(<SalesTrendChart data={data} />);
    expect(captured[0].notMerge).toBe(true);
  });

  it("renders with the installed echarts", () => {
    render(<SalesTrendChart data={data} />);
    const svg = renderSvg(lastOption());
    expect(svg).toContain("<svg");
    expect(svg).toContain("Electronics");
    expect(svg).toContain("Tools");
  });

  it("renders an empty dataset", () => {
    render(<SalesTrendChart data={[]} />);
    expect(renderSvg(lastOption())).toContain("<svg");
  });
});

describe("ForecastChart", () => {
  beforeEach(() => {
    captured.length = 0;
  });

  const actual = [
    { month: "2024-02-01", item: "Widget", stock_group: "G", sold_qty: 12, sold_amount: 0 },
    { month: "2024-01-01", item: "Widget", stock_group: "G", sold_qty: 10, sold_amount: 0 },
  ];
  const forecast = [
    {
      item: "Widget",
      stock_group: "G",
      forecast_month: "2024-03-01",
      forecast_qty: 13,
      lower_bound: 9,
      upper_bound: 17,
    },
  ];

  it("places actuals before forecasts on a shared axis", () => {
    render(<ForecastChart actual={actual} forecast={forecast} item="Widget" />);
    const option = lastOption();
    expect(option.xAxis.data).toEqual(["Jan 24", "Feb 24", "Mar 24"]);
    expect(option.series[0].data).toEqual([10, 12, null]);
    expect(option.series[1].data).toEqual([null, null, 13]);
  });

  it("renders with the installed echarts", () => {
    render(<ForecastChart actual={actual} forecast={forecast} item="Widget" />);
    const svg = renderSvg(lastOption());
    expect(svg).toContain("Widget");
    expect(svg).toContain("Forecast");
  });
});
