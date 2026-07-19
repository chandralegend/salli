import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { computeTaxTaxComputePost, getLatestTaxLatestGet } from "@/lib/api/sdk.gen";

export type BandWorking = { band: string; rate: string; taxable_in_band: string; tax: string };

export type TaxComputationFull = {
  pack_year: string;
  pack_version: string;
  gross_income: string;
  personal_relief_applied: string;
  taxable_income: string;
  tax_before_credits: string;
  apit_credit: string;
  ait_credit: string;
  foreign_tax_credit: string;
  tax_payable: string;
  band_workings: BandWorking[];
};

export function useLatestTax(year = "2025/26") {
  return useQuery({
    queryKey: ["tax-latest", year],
    queryFn: async () => {
      const { data } = await getLatestTaxLatestGet({ query: { year }, throwOnError: true });
      return (data as unknown as { result: TaxComputationFull | null }).result;
    },
  });
}

export function useComputeTax(year = "2025/26") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await computeTaxTaxComputePost({ query: { year }, throwOnError: true });
      return data as unknown as TaxComputationFull;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-latest"] }),
  });
}
