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
  overdue_days: number;
  aging_bucket: "credit" | "current" | "1_30" | "31_60" | "60plus";
  score_dso: number;
  score_aging: number;
  score_recency: number;
  score_engagement: number;
  score_balance_ratio: number;
  health_score: number;
  health_rag: "green" | "amber" | "red";
}

export interface AgingSummary {
  total_receivable: number;
  current_ar: number;
  overdue_1_30: number;
  overdue_31_60: number;
  overdue_60plus: number;
  credit_balance: number;
  current_count: number;
  overdue_1_30_count: number;
  overdue_31_60_count: number;
  overdue_60plus_count: number;
  credit_count: number;
  total_revenue_12m: number;
  portfolio_dso: number | null;
  best_possible_dso: number | null;
  add_days: number | null;
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
