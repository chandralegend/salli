"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getBalanceSheetReportsBalanceSheetGet,
  getNetWorthStatementReportsNetWorthGet,
  incomeStatementLedgerIncomeStatementGet,
} from "@/lib/api/sdk.gen";
import { API_URL } from "@/lib/api-client";
import { getStoredToken } from "@/lib/store";

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

export type NetWorthPoint = { date: string; net_worth: string };

export type NetWorthStatement = {
  current_net_worth: string;
  as_of: string;
  trend: NetWorthPoint[];
};

export type IncomeStatement = {
  from_date: string;
  to_date: string;
  income: Record<string, string>;
  expenses: Record<string, string>;
  net_income: string;
};

/** The CSV export endpoint only supports these server-side report types. */
export type ExportableReport = "balance-sheet" | "net-worth" | "goal-progress";

export function useBalanceSheet() {
  return useQuery({
    queryKey: ["reports", "balance-sheet"],
    queryFn: async () => {
      const { data } = await getBalanceSheetReportsBalanceSheetGet({ throwOnError: true });
      return data as unknown as BalanceSheet;
    },
  });
}

export function useNetWorthStatement() {
  return useQuery({
    queryKey: ["reports", "net-worth"],
    queryFn: async () => {
      const { data } = await getNetWorthStatementReportsNetWorthGet({ throwOnError: true });
      return data as unknown as NetWorthStatement;
    },
  });
}

export function useIncomeStatement(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ["reports", "income-statement", range.from, range.to],
    queryFn: async () => {
      const { data } = await incomeStatementLedgerIncomeStatementGet({
        query: { from_date: range.from, to_date: range.to },
        throwOnError: true,
      });
      return data as unknown as IncomeStatement;
    },
  });
}

/**
 * Downloads a report as CSV from `/reports/{type}/export` and triggers a browser
 * download. Uses a raw authenticated fetch — the generated SDK types the body as
 * `unknown`, and we need the raw bytes for the Blob.
 */
export async function exportReportCsv(reportType: ExportableReport): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(`${API_URL}/reports/${reportType}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportType}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
