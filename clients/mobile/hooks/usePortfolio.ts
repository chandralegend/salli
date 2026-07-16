import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/** Mirrors clients/web/src/hooks/usePortfolio.ts */

export type Holding = {
  id: string;
  symbol: string;
  name: string;
  asset_class: string;
  cost_basis: string;
  current_value: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AllocationSlice = { asset_class: string; current_value: string; pct_of_portfolio: string };
export type RebalancingAlert = { asset_class: string; current_pct: string; target_pct: string; drift_pct: string };

export type PortfolioSummary = {
  total_value: string;
  total_cost_basis: string;
  total_gain: string;
  total_gain_pct: string;
  allocation: AllocationSlice[];
  alerts: RebalancingAlert[];
};

export function useHoldings(activeOnly = false) {
  return useQuery({
    queryKey: ["portfolio", "list", activeOnly],
    queryFn: () =>
      apiFetch<{ holdings: Holding[] }>("GET", `/portfolio/?active_only=${activeOnly}`).then((d) => d.holdings),
    staleTime: 30_000,
  });
}

export function usePortfolioSummary(targets: Record<string, number>) {
  const params = Object.entries(targets)
    .map(([k, v]) => `target=${encodeURIComponent(`${k}:${v}`)}`)
    .join("&");
  return useQuery({
    queryKey: ["portfolio", "summary", targets],
    queryFn: () => apiFetch<PortfolioSummary>("GET", `/portfolio/summary${params ? `?${params}` : ""}`),
    staleTime: 15_000,
  });
}

export function useAddHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { symbol: string; name: string; asset_class: string; cost_basis: number; current_value: number }) =>
      apiFetch<{ id: string }>("POST", "/portfolio/", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch("PATCH", `/portfolio/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useDeleteHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch("DELETE", `/portfolio/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}
