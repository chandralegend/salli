"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addDebtDebtPost,
  deleteDebtDebtDebtIdDelete,
  getPayoffPlanDebtPayoffPlanGet,
  listDebtsDebtGet,
  updateDebtDebtDebtIdPatch,
} from "@/lib/api/sdk.gen";
import type { DebtRequest, DebtUpdateRequest } from "@/lib/api/types.gen";

/** Money fields arrive as decimal strings; `apr` is a FRACTION (0.24 = 24%). */
export type Debt = {
  id: string;
  name: string;
  principal: string;
  apr: string;
  minimum_payment: string;
  is_active: boolean;
};

export type PayoffScheduleRow = {
  month: number;
  debt_name: string;
  payment: string;
  principal_paid: string;
  interest_paid: string;
  remaining_balance: string;
};

export type PayoffPlan = {
  strategy: string;
  months_to_payoff: number | null;
  total_interest_paid: string;
  schedule: PayoffScheduleRow[];
};

export type Strategy = "avalanche" | "snowball";

/** Invalidate the debt list and every payoff-plan variant after a mutation. */
function invalidateDebt(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["debts"] });
  qc.invalidateQueries({ queryKey: ["payoff-plan"] });
}

export function useDebt(extraMonthlyPayment: number, strategy: Strategy) {
  const qc = useQueryClient();

  const debts = useQuery({
    queryKey: ["debts"],
    queryFn: async () => {
      const { data } = await listDebtsDebtGet({ throwOnError: true });
      return (data as unknown as { debts: Debt[] }).debts;
    },
  });

  // Plan for the chosen extra payment, plus a baseline (0 extra) so the UI can
  // show interest & months saved by paying extra.
  const plan = useQuery({
    queryKey: ["payoff-plan", extraMonthlyPayment, strategy],
    queryFn: async () => {
      const { data } = await getPayoffPlanDebtPayoffPlanGet({
        query: { extra_monthly_payment: extraMonthlyPayment, strategy },
        throwOnError: true,
      });
      return data as unknown as PayoffPlan;
    },
  });

  const basePlan = useQuery({
    queryKey: ["payoff-plan", 0, strategy],
    queryFn: async () => {
      const { data } = await getPayoffPlanDebtPayoffPlanGet({
        query: { extra_monthly_payment: 0, strategy },
        throwOnError: true,
      });
      return data as unknown as PayoffPlan;
    },
  });

  const addDebt = useMutation({
    mutationFn: async (input: DebtRequest) => {
      await addDebtDebtPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      invalidateDebt(qc);
      toast.success("Debt added");
    },
    onError: (e) => toast.error(`Failed to add debt: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const updateDebt = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: DebtUpdateRequest }) => {
      await updateDebtDebtDebtIdPatch({ path: { debt_id: id }, body, throwOnError: true });
    },
    onSuccess: () => {
      invalidateDebt(qc);
      toast.success("Debt updated");
    },
    onError: (e) => toast.error(`Failed to update debt: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const deleteDebt = useMutation({
    mutationFn: async (id: string) => {
      await deleteDebtDebtDebtIdDelete({ path: { debt_id: id }, throwOnError: true });
    },
    onSuccess: () => {
      invalidateDebt(qc);
      toast.success("Debt deleted");
    },
    onError: (e) => toast.error(`Failed to delete debt: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  return { debts, plan, basePlan, addDebt, updateDebt, deleteDebt };
}
