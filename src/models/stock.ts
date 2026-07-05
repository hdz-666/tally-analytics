export interface StockItem {
  name: string;
  stock_group: string;
  closing_balance: number;
  closing_value: number;
  closing_rate: number;
}

export interface StockGroup {
  name: string;
  parent: string | null;
}

export interface StockSummary {
  total_items: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}
