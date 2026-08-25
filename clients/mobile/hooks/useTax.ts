import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { computeTaxTaxComputePost, getLatestTaxLatestGet, listPacksTaxPacksGet } from "@/lib/api/sdk.gen";

export type BandWorking = {
  /** Pre-rendered for display, e.g. "LKR 0 – LKR 1,000,000". */
  band: string;
  /** Pre-rendered, e.g. "6%". */
  rate: string;
  taxable_in_band: string;
  tax: string;
  /** Numeric bounds. Optional because `/tax/latest` replays stored rows, and
   *  ones written before these fields existed don't carry them. `to_amount` is
   *  null for the open-ended top band. */
  from_amount?: string;
  to_amount?: string | null;
  rate_fraction?: string;
};

export type TaxPack = {
  country: string;
  year: string;
  version: string;
  period_start: string;
  period_end: string;
  personal_relief: string;
  return_due: string; // "MM-DD"
};

export type TaxHistoryRow = { pack: TaxPack; result: TaxComputationFull | null };

export type TaxComputationFull = {
  pack_year: string;
  pack_version: string;
  gross_income: string;
  // Foreign Service Income is taxed at a flat rate outside the progressive
  // bands. These fields were omitted here, so a mobile user with foreign income
  // saw a headline figure their visible bands could not add up to.
  foreign_service_income: string;
  regular_income: string;
  fsi_tax: string;
  personal_relief_applied: string;
  qp_deduction: string;
  taxable_income: string;
  tax_before_credits: string;
  apit_credit: string;
  ait_credit: string;
  foreign_tax_credit: string;
  total_credits: string;
  tax_payable: string;
  /** Credits in excess of the liability — money owed back to the taxpayer. */
  refund_due: string;
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

export function useTaxPacks() {
  return useQuery({
    queryKey: ["tax-packs"],
    queryFn: async () => {
      const { data } = await listPacksTaxPacksGet({ throwOnError: true });
      return data as unknown as TaxPack[];
    },
  });
}

/** Per-assessment-year computations, one row per available pack (newest first).
 * There is no history endpoint, so we fetch the latest computation for each
 * pack year — only years with a real pack/computation appear (no fabrication). */
export function useTaxHistory() {
  return useQuery({
    queryKey: ["tax-history"],
    queryFn: async () => {
      const { data } = await listPacksTaxPacksGet({ throwOnError: true });
      const packs = (data as unknown as TaxPack[]) ?? [];
      const rows = await Promise.all(
        packs.map(async (pack) => {
          const { data: r } = await getLatestTaxLatestGet({ query: { year: pack.year }, throwOnError: true });
          return { pack, result: (r as unknown as { result: TaxComputationFull | null }).result };
        }),
      );
      return rows.sort((a, b) => (a.pack.year < b.pack.year ? 1 : -1)) as TaxHistoryRow[];
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
