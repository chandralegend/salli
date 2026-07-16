"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

export type Policy = {
  id: string;
  name: string;
  policy_type: string;
  provider: string;
  coverage_amount: string;
  premium_amount: string;
  premium_frequency: string;
  expiry_date: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CoverageTarget = { id: string; policy_type: string; target_amount: string };

export type CoverageGapLine = { policy_type: string; target_amount: string; actual_coverage: string; gap: string };
export type ExpiryAlert = { policy_name: string; policy_type: string; expiry_date: string; days_until_expiry: number };

export type CoverageReport = {
  lines: CoverageGapLine[];
  missing_types: string[];
  expiring_soon: ExpiryAlert[];
};

export function usePolicies(activeOnly = false) {
  return useQuery({
    queryKey: ["insurance", "policies", activeOnly],
    queryFn: () =>
      apiFetch<{ policies: Policy[] }>("GET", `/insurance/policies?active_only=${activeOnly}`).then((d) => d.policies),
    staleTime: 30_000,
  });
}

export function useCoverageTargets() {
  return useQuery({
    queryKey: ["insurance", "targets"],
    queryFn: () => apiFetch<{ targets: CoverageTarget[] }>("GET", "/insurance/targets").then((d) => d.targets),
    staleTime: 30_000,
  });
}

export function useCoverageReport() {
  return useQuery({
    queryKey: ["insurance", "report"],
    queryFn: () => apiFetch<CoverageReport>("GET", "/insurance/report"),
    staleTime: 15_000,
  });
}

export function useAddPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string; policy_type: string; provider: string; coverage_amount: number;
      premium_amount: number; premium_frequency: string; expiry_date: string;
    }) => apiFetch<{ id: string }>("POST", "/insurance/policies", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance"] });
      toast.success("Policy added");
    },
    onError: (e) => toast.error(`Failed to add policy: ${e instanceof Error ? e.message : "Unknown error"}`),
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch("PATCH", `/insurance/policies/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance"] });
      toast.success("Policy updated");
    },
    onError: (e) => toast.error(`Failed to update policy: ${e instanceof Error ? e.message : "Unknown error"}`),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch("DELETE", `/insurance/policies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance"] });
      toast.success("Policy deleted");
    },
    onError: (e) => toast.error(`Failed to delete policy: ${e instanceof Error ? e.message : "Unknown error"}`),
  });
}

export function useSetCoverageTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { policy_type: string; target_amount: number }) =>
      apiFetch<{ id: string }>("PUT", "/insurance/targets", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance"] });
      toast.success("Target saved");
    },
    onError: (e) => toast.error(`Failed to save target: ${e instanceof Error ? e.message : "Unknown error"}`),
  });
}

export function useDeleteCoverageTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyType: string) => apiFetch("DELETE", `/insurance/targets/${policyType}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance"] });
      toast.success("Target deleted");
    },
    onError: (e) => toast.error(`Failed to delete target: ${e instanceof Error ? e.message : "Unknown error"}`),
  });
}
