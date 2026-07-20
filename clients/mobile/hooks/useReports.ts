import { useQuery } from "@tanstack/react-query";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  getBalanceSheetReportsBalanceSheetGet,
  getNetWorthStatementReportsNetWorthGet,
  incomeStatementLedgerIncomeStatementGet,
} from "@/lib/api/sdk.gen";
import { API_URL } from "@/lib/api-client";
import { useSalliStore } from "@/lib/store";

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

/** The CSV export endpoint only supports these server-side report types. */
export type ExportableReport = "balance-sheet" | "net-worth" | "goal-progress";

/**
 * Downloads a report as CSV from `/reports/{type}/export`, writes it to the
 * cache dir and opens the native share sheet. Uses a raw fetch (the generated
 * SDK types the body as `unknown`; we need the text bytes for the file).
 */
export async function exportReportCsv(reportType: ExportableReport): Promise<void> {
  const token = useSalliStore.getState().token;
  const res = await fetch(`${API_URL}/reports/${reportType}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const csv = await res.text();
  const file = new File(Paths.cache, `${reportType}.csv`);
  file.create({ overwrite: true });
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Export report" });
  }
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
