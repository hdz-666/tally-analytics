export interface MonthlySales {
  month: string;
  item: string;
  sold_qty: number;
  sold_amount: number;
}

export interface GroupSales {
  month: string;
  stock_group: string;
  sold_qty: number;
  sold_amount: number;
}

export interface TopMover {
  item: string;
  stock_group: string;
  total_qty: number;
  total_amount: number;
  months_active: number;
}
