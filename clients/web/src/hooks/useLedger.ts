"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAccountsAccountsGet,
  addAccountAccountsPost,
  listEntriesEntriesGet,
} from "@/lib/api/sdk.gen";

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
  postings: Array<{
    account_id: string;
    direction: number;
    amount: string;
    currency: string;
    fx_rate: string;
  }>;
};

export function useLedger() {
  const qc = useQueryClient();

  const accounts = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await listAccountsAccountsGet({ throwOnError: true });
      return res.data as Account[];
    },
  });

  const entries = useQuery({
    queryKey: ["entries"],
    queryFn: async () => {
      const res = await listEntriesEntriesGet({ throwOnError: true });
      return res.data as JournalEntry[];
    },
  });

  const addAccount = useMutation({
    mutationFn: async (data: {
      code: string;
      name: string;
      type: "asset" | "liability" | "equity" | "income" | "expense";
      currency?: string;
    }) => {
      const res = await addAccountAccountsPost({ body: data, throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return { accounts, entries, addAccount };
}
