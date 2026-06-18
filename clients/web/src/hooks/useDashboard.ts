"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listAccountsAccountsGet,
  trialBalanceLedgerTrialBalanceGet,
  listRemindersRemindersGet,
  listEntriesEntriesGet,
} from "@/lib/api/sdk.gen";

export function useDashboard() {
  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await listAccountsAccountsGet({ throwOnError: true });
      return res.data as Array<{
        id: string;
        code: string;
        name: string;
        type: string;
        currency: string;
      }>;
    },
  });

  const trialBalance = useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const res = await trialBalanceLedgerTrialBalanceGet({ throwOnError: true });
      return res.data as Array<{
        account_id: string;
        account_code: string;
        account_name: string;
        account_type: string;
        debit_total: string;
        credit_total: string;
        net: string;
      }>;
    },
  });

  const reminders = useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: async () => {
      const res = await listRemindersRemindersGet({
        query: { status: "pending" },
        throwOnError: true,
      });
      return res.data as Array<{
        id: string;
        kind: string;
        due_date: string;
        status: string;
      }>;
    },
  });

  const recentEntries = useQuery({
    queryKey: ["entries", "recent"],
    queryFn: async () => {
      const res = await listEntriesEntriesGet({ throwOnError: true });
      const all = res.data as Array<{
        id: string;
        entry_date: string;
        description: string;
        source: string;
        postings: Array<{
          account_id: string;
          direction: number;
          amount: string;
          currency: string;
        }>;
      }>;
      return all.slice(0, 5);
    },
  });

  const tb = trialBalance.data ?? [];
  const netWorth = tb
    .filter((r) => ["asset", "liability", "equity"].includes(r.account_type))
    .reduce((sum, r) => sum + parseFloat(r.net), 0);

  const incomeYtd = tb
    .filter((r) => r.account_type === "income")
    .reduce((sum, r) => sum + Math.abs(parseFloat(r.net)), 0);

  const expensesYtd = tb
    .filter((r) => r.account_type === "expense")
    .reduce((sum, r) => sum + Math.abs(parseFloat(r.net)), 0);

  function fmt(n: number) {
    return n.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return {
    loading:
      accounts.isLoading ||
      trialBalance.isLoading ||
      reminders.isLoading ||
      recentEntries.isLoading,
    netWorth: fmt(netWorth),
    incomeYtd: fmt(incomeYtd),
    expensesYtd: fmt(expensesYtd),
    upcomingReminders: (reminders.data ?? []).slice(0, 3),
    recentEntries: recentEntries.data ?? [],
  };
}
