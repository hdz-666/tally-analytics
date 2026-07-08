export interface LedgerHealth {
  customer: string;
  outstanding_amount: number;
  credit_days: number;
  dso_estimate: number | null;
  revenue_12m: number;
  last_invoice_date: string | null;
  last_receipt_date: string | null;
  days_since_last_receipt: number;
  has_overdue: boolean;
  total_invoices: number;
  total_receipts: number;
  total_invoiced: number;
  total_received: number;
  score_dso: number;
  score_overdue: number;
  score_recency: number;
  score_engagement: number;
  score_balance_ratio: number;
  health_score: number;
  health_rag: "green" | "amber" | "red";
}

export interface PnlMonthly {
  month: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number | null;
  fixed_costs: number;
  loan_interest: number;
  total_overhead: number;
  net_profit: number;
  net_margin_pct: number | null;
}
