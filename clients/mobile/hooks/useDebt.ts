import { useQuery } from "@tanstack/react-query";

import { getPayoffPlanDebtPayoffPlanGet, listDebtsDebtGet } from "@/lib/api/sdk.gen";

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
