import api from "./api";
import type { AgingSummary, LedgerHealth, PnlMonthly } from "@/models/ledger";

export const ledgerApi = {
  getHealth: () =>
    api.get<LedgerHealth[]>("/ledger/health").then((r) => r.data),

  getPnl: () =>
    api.get<PnlMonthly[]>("/ledger/pnl").then((r) => r.data),

  getAgingSummary: () =>
    api.get<AgingSummary>("/ledger/aging-summary").then((r) => r.data),

  refresh: () =>
    api.post<{ message: string }>("/ledger/refresh").then((r) => r.data),
};
