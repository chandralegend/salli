import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addPolicyInsurancePoliciesPost,
  deletePolicyInsurancePoliciesPolicyIdDelete,
  deleteTargetInsuranceTargetsPolicyTypeDelete,
  getCoverageReportInsuranceReportGet,
  listPoliciesInsurancePoliciesGet,
  listTargetsInsuranceTargetsGet,
  setTargetInsuranceTargetsPut,
  updatePolicyInsurancePoliciesPolicyIdPatch,
} from "@/lib/api/sdk.gen";
import type { PolicyRequest, PolicyUpdateRequest } from "@/lib/api/types.gen";

export type Policy = {
  id: string;
  name: string;
  policy_type: string;
  provider: string;
  coverage_amount: string;
  premium_amount: string;
  expiry_date: string;
  is_active: boolean;
};

export type Target = { policy_type: string; target_amount: string };

export type CoverageReport = {
  lines: { policy_type: string; target_amount: string; actual_coverage: string; gap: string }[];
  missing_types: string[];
  expiring_soon: { policy_name: string; policy_type: string; expiry_date: string; days_until_expiry: number }[];
};

export function usePolicies() {
  return useQuery({
    queryKey: ["insurance-policies"],
    queryFn: async () => {
      const { data } = await listPoliciesInsurancePoliciesGet({ throwOnError: true });
      return (data as unknown as { policies: Policy[] }).policies;
    },
  });
}

export function useTargets() {
  return useQuery({
    queryKey: ["insurance-targets"],
    queryFn: async () => {
      const { data } = await listTargetsInsuranceTargetsGet({ throwOnError: true });
      return (data as unknown as { targets: Target[] }).targets;
    },
  });
}

export function useCoverageReport() {
  return useQuery({
    queryKey: ["insurance-coverage-report"],
    queryFn: async () => {
      const { data } = await getCoverageReportInsuranceReportGet({ throwOnError: true });
      return data as unknown as CoverageReport;
    },
  });
}

/** Invalidate every query that reflects the set of policies. */
function invalidatePolicyViews(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["insurance-policies"] });
  qc.invalidateQueries({ queryKey: ["insurance-coverage-report"] });
}

export function useAddPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PolicyRequest) => {
      await addPolicyInsurancePoliciesPost({ body: input, throwOnError: true });
    },
    onSuccess: () => invalidatePolicyViews(qc),
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PolicyUpdateRequest }) => {
      await updatePolicyInsurancePoliciesPolicyIdPatch({
        path: { policy_id: id },
        body,
        throwOnError: true,
      });
    },
    onSuccess: () => invalidatePolicyViews(qc),
  });
}

export function useInsuranceMutations() {
  const qc = useQueryClient();

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      await deletePolicyInsurancePoliciesPolicyIdDelete({ path: { policy_id: id }, throwOnError: true });
    },
    onSuccess: () => invalidatePolicyViews(qc),
  });

  const setTarget = useMutation({
    mutationFn: async (input: { policy_type: string; target_amount: number }) => {
      await setTargetInsuranceTargetsPut({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insurance-targets"] });
      qc.invalidateQueries({ queryKey: ["insurance-coverage-report"] });
    },
  });

  const deleteTarget = useMutation({
    mutationFn: async (policyType: string) => {
      await deleteTargetInsuranceTargetsPolicyTypeDelete({ path: { policy_type: policyType }, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insurance-targets"] }),
  });

  return { deletePolicy, setTarget, deleteTarget };
}
