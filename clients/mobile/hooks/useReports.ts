import { useQuery } from "@tanstack/react-query";

import {
  getBalanceSheetReportsBalanceSheetGet,
  getNetWorthStatementReportsNetWorthGet,
  incomeStatementLedgerIncomeStatementGet,
} from "@/lib/api/sdk.gen";

export type BalanceSheetLine = { code: string; name: string; balance: string };
export type BalanceSheet = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  total_assets: string;
  total_liabilities: string;
  total_equity: string;
  net_worth: string;
};

export type NetWorthStatementFull = {
  current_net_worth: string;
  as_of: string;
  trend: { date: string; net_worth: string }[];
};

export type IncomeStatement = {
  from_date: string;
  to_date: string;
  income: Record<string, string>;
  expenses: Record<string, string>;
  net_income: string;
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

export function useIncomeStatement(range?: { from: string; to: string }) {
  const now = new Date();
  const from = range?.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = range?.to ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["income-statement", from, to],
    queryFn: async () => {
      const { data } = await incomeStatementLedgerIncomeStatementGet({
        query: { from_date: from, to_date: to },
        throwOnError: true,
      });
      return data as unknown as IncomeStatement;
    },
  });
}
