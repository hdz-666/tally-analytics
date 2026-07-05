export interface ForecastPoint {
  item: string;
  stock_group: string;
  forecast_month: string;
  forecast_qty: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ReorderAlert {
  item: string;
  stock_group: string;
  current_stock: number;
  reorder_point: number;
  reorder_qty: number;
  needs_reorder: boolean;
}

export interface ForecastRunResponse {
  items_processed: number;
  message: string;
}
