import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addDebtDebtPost,
  deleteDebtDebtDebtIdDelete,
  getPayoffPlanDebtPayoffPlanGet,
  listDebtsDebtGet,
  updateDebtDebtDebtIdPatch,
} from "@/lib/api/sdk.gen";
import type { DebtRequest, DebtUpdateRequest } from "@/lib/api/types.gen";

export type Debt = {
  id: string;
  name: string;
  principal: string;
  apr: string;
  minimum_payment: string;
  is_active: boolean;
};

export type PayoffPlan = {
  strategy: string;
  months_to_payoff: number | null;
  total_interest_paid: string;
  schedule: { month: number; debt_name: string; payment: string; principal_paid: string; interest_paid: string; remaining_balance: string }[];
};

export function useDebts() {
  return useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await listDebtsDebtGet({ throwOnError: true });
      return (data as unknown as { debts: Debt[] }).debts;
    },
  });
}

export function usePayoffPlan(extraMonthlyPayment: number, strategy: "avalanche" | "snowball") {
  return useQuery({
    queryKey: ["payoff-plan", extraMonthlyPayment, strategy],
    queryFn: async () => {
      const { data } = await getPayoffPlanDebtPayoffPlanGet({
        query: { extra_monthly_payment: extraMonthlyPayment, strategy },
        throwOnError: true,
      });
      return data as unknown as PayoffPlan;
    },
  });
}

/** Invalidate the debt list and every payoff-plan variant after a mutation. */
function invalidateDebt(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["debts"] });
  qc.invalidateQueries({ queryKey: ["payoff-plan"] });
  qc.invalidateQueries({ queryKey: ["debt-payoff-plan"] });
}

/** Add a debt (POST /debt). APR is a fraction (0.24 = 24%). */
export function useAddDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DebtRequest) => {
      await addDebtDebtPost({ body: input, throwOnError: true });
    },
    onSuccess: () => invalidateDebt(qc),
  });
}

/** Update a debt (PATCH /debt/{id}). APR is a fraction (0.24 = 24%). */
export function useUpdateDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: DebtUpdateRequest }) => {
      await updateDebtDebtDebtIdPatch({ path: { debt_id: id }, body, throwOnError: true });
    },
    onSuccess: () => invalidateDebt(qc),
  });
}

/** Delete a debt (DELETE /debt/{id}). */
export function useDeleteDebt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDebtDebtDebtIdDelete({ path: { debt_id: id }, throwOnError: true });
    },
    onSuccess: () => invalidateDebt(qc),
  });
}
