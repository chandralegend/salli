import { useQuery } from "@tanstack/react-query";

import { getBalanceSheetReportsBalanceSheetGet, getNetWorthStatementReportsNetWorthGet } from "@/lib/api/sdk.gen";

export type BalanceSheetLine = { code: string; name: string; balance: string };
export type BalanceSheet = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
};

export type NetWorthStatementFull = {
  current_net_worth: string;
  as_of: string;
  trend: { date: string; net_worth: string }[];
};

export function useBalanceSheet() {
  return useQuery({
    queryKey: ["balance-sheet"],
    queryFn: async () => {
      const { data } = await getBalanceSheetReportsBalanceSheetGet({ throwOnError: true });
      return data as unknown as BalanceSheet;
    },
  });
}

export function useNetWorthStatement() {
  return useQuery({
    queryKey: ["net-worth-full"],
    queryFn: async () => {
      const { data } = await getNetWorthStatementReportsNetWorthGet({ throwOnError: true });
      return data as unknown as NetWorthStatementFull;
    },
  });
}
