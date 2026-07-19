import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getAccountOverviewAccountsAccountIdOverviewGet,
  addEntryEntriesPost,
  incomeStatementLedgerIncomeStatementGet,
  listAccountsAccountsGet,
  listEntriesEntriesGet,
  reverseEntryEntriesEntryIdReversePost,
  trialBalanceLedgerTrialBalanceGet,
} from "@/lib/api/sdk.gen";
import type { Account, JournalEntry } from "./useDashboard";

export type AccountTransaction = {
  entry_id: string;
  entry_date: string;
  description: string;
  source: string;
  external_ref: string | null;
  running_balance: string;
};
export type AccountOverview = {
  account: Account;
  current_balance: string;
  transactions: AccountTransaction[];
};

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data } = await listAccountsAccountsGet({ throwOnError: true });
      return data as unknown as Account[];
    },
  });
}

/** Per-account balances keyed by account id — the accounts list omits balances. */
export function useTrialBalance() {
  return useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const { data } = await trialBalanceLedgerTrialBalanceGet({ throwOnError: true });
      return (data as unknown as { balances: Record<string, string> }).balances;
    },
  });
}

export function useAccountOverview(accountId: string | null) {
  return useQuery({
    queryKey: ["account-overview", accountId],
    queryFn: async () => {
      const { data } = await getAccountOverviewAccountsAccountIdOverviewGet({
        path: { account_id: accountId! },
        throwOnError: true,
      });
      return data as unknown as AccountOverview;
    },
    enabled: Boolean(accountId),
  });
}

export function useEntries() {
  return useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const { data } = await listEntriesEntriesGet({ throwOnError: true });
      return data as unknown as JournalEntry[];
    },
  });
}

export function useIncomeStatement(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["income-statement", fromDate, toDate],
    queryFn: async () => {
      const { data } = await incomeStatementLedgerIncomeStatementGet({
        query: { from_date: fromDate, to_date: toDate },
        throwOnError: true,
      });
      return data as unknown as { net_income: string };
    },
  });
}

export function useLedgerMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["entries"] });
    qc.invalidateQueries({ queryKey: ["accounts"] });
    qc.invalidateQueries({ queryKey: ["net-worth"] });
  };

  const postEntry = async (input: {
    entry_date: string;
    description: string;
    debitAccountId: string;
    creditAccountId: string;
    amount: string;
  }) => {
    await addEntryEntriesPost({
      body: {
        entry_date: input.entry_date,
        description: input.description,
        source: "manual",
        postings: [
          // Direction enum: DEBIT = 1, CREDIT = -1 (not 2).
          { account_id: input.debitAccountId, direction: 1, amount: input.amount, currency: "LKR" },
          { account_id: input.creditAccountId, direction: -1, amount: input.amount, currency: "LKR" },
        ],
      },
      throwOnError: true,
    });
    invalidate();
  };

  const reverseEntry = async (entryId: string) => {
    await reverseEntryEntriesEntryIdReversePost({ path: { entry_id: entryId }, throwOnError: true });
    invalidate();
  };

  return { postEntry, reverseEntry };
}
