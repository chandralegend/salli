import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addHoldingPortfolioPost,
  getSummaryPortfolioSummaryGet,
  listHoldingsPortfolioGet,
} from "@/lib/api/sdk.gen";

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  asset_class: string;
  cost_basis: string;
  current_value: string;
};

export type AllocationSlice = {
  asset_class: string;
  current_value: string;
  pct_of_portfolio: string;
};

export type PortfolioSummaryFull = {
  total_value: string;
  total_cost_basis: string;
  total_gain: string;
  total_gain_pct: string;
  allocation: AllocationSlice[];
};

export function useHoldings() {
  return useQuery({
    queryKey: ["holdings"],
    queryFn: async () => {
      const { data } = await listHoldingsPortfolioGet({ throwOnError: true });
      return (data as unknown as { holdings: Holding[] }).holdings;
    },
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolio-summary-full"],
    queryFn: async () => {
      const { data } = await getSummaryPortfolioSummaryGet({ throwOnError: true });
      return data as unknown as PortfolioSummaryFull;
    },
  });
}

export type NewHolding = {
  symbol: string;
  name: string;
  asset_class: string;
  cost_basis: number;
  current_value: number;
};

/** Add a manually-declared holding (POST /portfolio) and refresh both the
 * holdings list and the derived allocation/ROI summary. */
export function useAddHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewHolding) => {
      await addHoldingPortfolioPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holdings"] });
      qc.invalidateQueries({ queryKey: ["portfolio-summary-full"] });
    },
  });
}
