"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  addHoldingPortfolioPost,
  deleteHoldingPortfolioHoldingIdDelete,
  getSummaryPortfolioSummaryGet,
  listHoldingsPortfolioGet,
  updateHoldingPortfolioHoldingIdPatch,
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
  /** Fraction in [0, 1] — multiply by 100 for display. */
  pct_of_portfolio: string;
};

export type PortfolioSummary = {
  total_value: string;
  total_cost_basis: string;
  total_gain: string;
  /** Fraction (e.g. "0.1234" = 12.34%). */
  total_gain_pct: string;
  allocation: AllocationSlice[];
};

export type NewHolding = {
  symbol: string;
  name: string;
  asset_class: string;
  cost_basis: number;
  current_value: number;
};

export type HoldingPatch = {
  symbol?: string;
  name?: string;
  asset_class?: string;
  cost_basis?: number;
  current_value?: number;
};

/** Manually-declared holdings, allocation and derived ROI summary.
 * All money and percentage fields are decimal strings — never parse to float
 * for arithmetic; use lib/format for display. Mutations invalidate both the
 * holdings list and the derived summary, and toast on success/failure. */
export function usePortfolio() {
  const qc = useQueryClient();

  const holdings = useQuery({
    queryKey: ["holdings"],
    queryFn: async () => {
      const { data } = await listHoldingsPortfolioGet({ throwOnError: true });
      return (data as unknown as { holdings: Holding[] }).holdings;
    },
  });

  const summary = useQuery({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const { data } = await getSummaryPortfolioSummaryGet({ throwOnError: true });
      return data as unknown as PortfolioSummary;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["holdings"] });
    qc.invalidateQueries({ queryKey: ["portfolio-summary"] });
  };

  const addHolding = useMutation({
    mutationFn: async (input: NewHolding) => {
      await addHoldingPortfolioPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Holding added");
    },
    onError: (e) =>
      toast.error(`Failed to add holding: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const updateHolding = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: HoldingPatch }) => {
      await updateHoldingPortfolioHoldingIdPatch({
        path: { holding_id: id },
        body: patch,
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Holding updated");
    },
    onError: (e) =>
      toast.error(`Failed to update holding: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  const deleteHolding = useMutation({
    mutationFn: async (id: string) => {
      await deleteHoldingPortfolioHoldingIdDelete({
        path: { holding_id: id },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Holding deleted");
    },
    onError: (e) =>
      toast.error(`Failed to delete holding: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  return { holdings, summary, addHolding, updateHolding, deleteHolding };
}
