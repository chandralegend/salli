"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  premium_frequency: string;
  expiry_date: string;
  is_active: boolean;
};

export type Target = { policy_type: string; target_amount: string };

export type CoverageLine = {
  policy_type: string;
  target_amount: string;
  actual_coverage: string;
  gap: string;
};

export type ExpiringPolicy = {
  policy_name: string;
  policy_type: string;
  expiry_date: string;
  days_until_expiry: number;
};

export type CoverageReport = {
  lines: CoverageLine[];
  missing_types: string[];
  expiring_soon: ExpiringPolicy[];
};

const POLICIES_KEY = ["insurance-policies"];
const TARGETS_KEY = ["insurance-targets"];
const REPORT_KEY = ["insurance-coverage-report"];

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Unknown error";
}

export function useInsurance() {
  const qc = useQueryClient();

  const policies = useQuery({
    queryKey: POLICIES_KEY,
    queryFn: async () => {
      const { data } = await listPoliciesInsurancePoliciesGet({ throwOnError: true });
      return (data as unknown as { policies: Policy[] }).policies;
    },
  });

  const targets = useQuery({
    queryKey: TARGETS_KEY,
    queryFn: async () => {
      const { data } = await listTargetsInsuranceTargetsGet({ throwOnError: true });
      return (data as unknown as { targets: Target[] }).targets;
    },
  });

  const report = useQuery({
    queryKey: REPORT_KEY,
    queryFn: async () => {
      const { data } = await getCoverageReportInsuranceReportGet({ throwOnError: true });
      return data as unknown as CoverageReport;
    },
  });

  // A policy change moves both the policy list and the coverage report.
  const invalidatePolicyViews = () => {
    qc.invalidateQueries({ queryKey: POLICIES_KEY });
    qc.invalidateQueries({ queryKey: REPORT_KEY });
  };
  // A target change moves both the target list and the coverage report.
  const invalidateTargetViews = () => {
    qc.invalidateQueries({ queryKey: TARGETS_KEY });
    qc.invalidateQueries({ queryKey: REPORT_KEY });
  };

  const addPolicy = useMutation({
    mutationFn: async (input: PolicyRequest) => {
      await addPolicyInsurancePoliciesPost({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      invalidatePolicyViews();
      toast.success("Policy added");
    },
    onError: (e) => toast.error(`Failed to add policy: ${errMsg(e)}`),
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: PolicyUpdateRequest }) => {
      await updatePolicyInsurancePoliciesPolicyIdPatch({
        path: { policy_id: id },
        body,
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidatePolicyViews();
      toast.success("Policy updated");
    },
    onError: (e) => toast.error(`Failed to update policy: ${errMsg(e)}`),
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      await deletePolicyInsurancePoliciesPolicyIdDelete({
        path: { policy_id: id },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidatePolicyViews();
      toast.success("Policy deleted");
    },
    onError: (e) => toast.error(`Failed to delete policy: ${errMsg(e)}`),
  });

  const setTarget = useMutation({
    mutationFn: async (input: { policy_type: string; target_amount: number }) => {
      await setTargetInsuranceTargetsPut({ body: input, throwOnError: true });
    },
    onSuccess: () => {
      invalidateTargetViews();
      toast.success("Target saved");
    },
    onError: (e) => toast.error(`Failed to save target: ${errMsg(e)}`),
  });

  const deleteTarget = useMutation({
    mutationFn: async (policyType: string) => {
      await deleteTargetInsuranceTargetsPolicyTypeDelete({
        path: { policy_type: policyType },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      invalidateTargetViews();
      toast.success("Target removed");
    },
    onError: (e) => toast.error(`Failed to remove target: ${errMsg(e)}`),
  });

  return {
    policies,
    targets,
    report,
    addPolicy,
    updatePolicy,
    deletePolicy,
    setTarget,
    deleteTarget,
  };
}
