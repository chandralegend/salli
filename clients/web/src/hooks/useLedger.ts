"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listAccountsAccountsGet,
  addAccountAccountsPost,
  listEntriesEntriesGet,
  addEntryEntriesPost,
  incomeStatementLedgerIncomeStatementGet,
  getAccountOverviewAccountsAccountIdOverviewGet,
  reactivateAccountAccountsAccountIdReactivatePost,
  trialBalanceLedgerTrialBalanceGet,
} from "@/lib/api/sdk.gen";
import { apiFetch } from "@/lib/api-fetch";

export type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  parent_id?: string | null;
  is_active: boolean;
};

export type JournalEntry = {
  id: string;
  entry_date: string;
  description: string;
  source: string;
  external_ref?: string | null;
  reversed_by?: string | null;
  postings: Array<{
    account_id: string;
    direction: number;
    amount: string;
    currency: string;
    fx_rate: string;
  }>;
};

export type IncomeStatement = {
  from_date: string;
  to_date: string;
  income: Record<string, string>;
  expenses: Record<string, string>;
  net_income: string;
};

export type AccountTransaction = {
  entry_id: string;
  entry_date: string;
  description: string;
  source: string;
  external_ref?: string | null;
  running_balance: string;
};

export type AccountOverview = {
  account: Account;
  current_balance: string;
  transactions: AccountTransaction[];
};

/** Balance hero + running transaction history for one account.
 * Wraps GET /accounts/{id}/overview; disabled until an id is selected. */
export function useAccountOverview(accountId: string | null) {
  return useQuery({
    queryKey: ["account-overview", accountId],
    queryFn: async () => {
      const res = await getAccountOverviewAccountsAccountIdOverviewGet({
        path: { account_id: accountId! },
        throwOnError: true,
      });
      return res.data as unknown as AccountOverview;
    },
    enabled: Boolean(accountId),
  });
}

export function useLedger(fromDate?: string, toDate?: string) {
  const qc = useQueryClient();

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await listAccountsAccountsGet({ throwOnError: true });
      return res.data as Account[];
    },
  });

  const entries = useQuery({
    queryKey: ["entries", fromDate, toDate],
    queryFn: async () => {
      const res = await listEntriesEntriesGet({
        query: fromDate ? { from_date: fromDate, to_date: toDate } : undefined,
        throwOnError: true,
      });
      return res.data as JournalEntry[];
    },
  });

  // Per-account balances (account_id → signed balance string), for the
  // account cards. Mirrors the mobile trial-balance query.
  const trialBalance = useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const res = await trialBalanceLedgerTrialBalanceGet({ throwOnError: true });
      return (res.data as unknown as { balances: Record<string, string> }).balances;
    },
  });

  const incomeStatement = useQuery({
    queryKey: ["income-statement", fromDate, toDate],
    queryFn: async () => {
      // LK AY is April 1 – March 31. Default to the most recently completed AY:
      // if today >= April 1 → from=(year-1)-04-01, to=year-03-31
      // if today < April 1 → from=(year-2)-04-01, to=(year-1)-03-31
      const today = new Date();
      const y = today.getFullYear();
      const lastAYStartYear = today.getMonth() >= 3 ? y - 1 : y - 2;
      const from = fromDate ?? `${lastAYStartYear}-04-01`;
      const to = toDate ?? `${lastAYStartYear + 1}-03-31`;
      const res = await incomeStatementLedgerIncomeStatementGet({
        query: { from_date: from, to_date: to },
        throwOnError: true,
      });
      return res.data as unknown as IncomeStatement;
    },
  });

  const addAccount = useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      type: "asset" | "liability" | "equity" | "income" | "expense";
      currency?: string;
    }): Promise<Account> => {
      const res = await addAccountAccountsPost({ body: data, throwOnError: true });
      const { id } = res.data as unknown as { id: string };
      return { id, code: data.code, name: data.name, type: data.type, currency: data.currency ?? "LKR", is_active: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created");
    },
    onError: (e) => toast.error(`Failed to create account: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const updateAccount = useMutation({
    mutationFn: async (data: {
      id: string;
      code: string;
      name: string;
      type: string;
      currency: string;
    }) => {
      return apiFetch(`PATCH`, `/accounts/${data.id}`, {
        code: data.code,
        name: data.name,
        type: data.type,
        currency: data.currency,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account updated");
    },
    onError: (e) => toast.error(`Failed to update account: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const deactivateAccount = useMutation({
    mutationFn: async (accountId: string) => {
      return apiFetch("DELETE", `/accounts/${accountId}`);
    },
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      qc.invalidateQueries({ queryKey: ["account-overview", accountId] });
      toast.success("Account deactivated");
    },
    onError: (e) => toast.error(`Failed to deactivate account: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const reactivateAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await reactivateAccountAccountsAccountIdReactivatePost({
        path: { account_id: accountId },
        throwOnError: true,
      });
      return res.data;
    },
    onSuccess: (_data, accountId) => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      qc.invalidateQueries({ queryKey: ["account-overview", accountId] });
      toast.success("Account reactivated");
    },
    onError: (e) => toast.error(`Failed to reactivate account: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const addEntry = useMutation({
    mutationFn: async (data: {
      entry_date: string;
      description: string;
      postings: Array<{ account_id: string; direction: number; amount: string; currency: string }>;
    }) => {
      const res = await addEntryEntriesPost({ body: data, throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      qc.invalidateQueries({ queryKey: ["income-statement"] });
      toast.success("Journal entry posted");
    },
    onError: (e) => toast.error(`Failed to post entry: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const reverseEntry = useMutation({
    mutationFn: async (entryId: string) => {
      return apiFetch<{ id: string }>("POST", `/entries/${entryId}/reverse`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["trial-balance"] });
      qc.invalidateQueries({ queryKey: ["income-statement"] });
      toast.success("Reversing entry posted");
    },
    onError: (e) => toast.error(`Failed to reverse entry: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  return {
    accounts,
    entries,
    trialBalance,
    incomeStatement,
    addAccount,
    updateAccount,
    deactivateAccount,
    reactivateAccount,
    addEntry,
    reverseEntry,
  };
}
