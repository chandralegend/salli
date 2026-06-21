"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listAccountsAccountsGet,
  trialBalanceLedgerTrialBalanceGet,
  listRemindersRemindersGet,
  listEntriesEntriesGet,
} from "@/lib/api/sdk.gen";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
};

type TrialBalanceResponse = {
  balances: Record<string, string>;
  net: string;
};

export function useDashboard() {
  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await listAccountsAccountsGet();
      return (res.data ?? []) as Account[];
    },
  });

  const trialBalance = useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const res = await trialBalanceLedgerTrialBalanceGet();
      return (res.data ?? { balances: {}, net: "0" }) as TrialBalanceResponse;
    },
  });

  const reminders = useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: async () => {
      const res = await listRemindersRemindersGet();
      const payload = res.data as unknown as { reminders?: unknown[] } | null;
      return (payload?.reminders ?? []) as Array<{
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
      const res = await listEntriesEntriesGet();
      const all = (res.data ?? []) as Array<{
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

  // Build account lookup map by id
  const accountMap = (accounts.data ?? []).reduce<Record<string, Account>>(
    (m, a) => { m[a.id] = a; return m; },
    {}
  );

  const balances = trialBalance.data?.balances ?? {};

  // Net worth = sum of asset balances minus liability balances
  const netWorth = Object.entries(balances).reduce((sum, [id, val]) => {
    const type = accountMap[id]?.type;
    if (type === "asset") return sum + parseFloat(val);
    if (type === "liability") return sum - parseFloat(val);
    return sum;
  }, 0);

  // Income YTD = sum of absolute income account balances (credits are negative)
  const incomeYtd = Object.entries(balances).reduce((sum, [id, val]) => {
    if (accountMap[id]?.type === "income") return sum + Math.abs(parseFloat(val));
    return sum;
  }, 0);

  // Expenses YTD = sum of expense account balances (debits are positive)
  const expensesYtd = Object.entries(balances).reduce((sum, [id, val]) => {
    if (accountMap[id]?.type === "expense") return sum + Math.abs(parseFloat(val));
    return sum;
  }, 0);

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
    upcomingReminders: (reminders.data ?? [])
      .filter((r) => r.status !== "done")
      .slice(0, 3),
    recentEntries: recentEntries.data ?? [],
  };
}
