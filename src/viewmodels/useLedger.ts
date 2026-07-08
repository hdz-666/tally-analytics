import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { ledgerApi } from "@/services/ledgerApi";

export const useLedgerHealth = () =>
  useQuery({
    queryKey: ["ledger", "health"],
    queryFn: ledgerApi.getHealth,
  });

export const usePnlMonthly = () =>
  useQuery({
    queryKey: ["ledger", "pnl"],
    queryFn: ledgerApi.getPnl,
  });

export const useRefreshLedger = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ledgerApi.refresh,
    onSuccess: (data) => {
      message.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
    onError: () => message.error("Refresh failed."),
  });
};
