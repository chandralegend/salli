import { useQuery } from "@tanstack/react-query";

import { getSummaryPortfolioSummaryGet, listHoldingsPortfolioGet } from "@/lib/api/sdk.gen";

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  asset_class: string;
  cost_basis: string;
  current_value: string;
};

export type PortfolioSummaryFull = {
  total_value: string;
  total_cost_basis: string;
  total_gain: string;
  total_gain_pct: string;
  allocation: { asset_class: string; current_value: string; pct_of_portfolio: string }[];
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
