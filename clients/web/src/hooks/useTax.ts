"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getLatestTaxLatestGet,
  computeTaxTaxComputePost,
} from "@/lib/api/sdk.gen";

export type TaxBand = {
  band: string;
  rate: string;
  taxable_in_band: string;
  tax: string;
};

export type TaxResult = {
  year: string;
  taxable_income: string;
  personal_relief: string;
  net_taxable: string;
  bands: TaxBand[];
  total_tax: string;
  credits: { apit: string; ait: string; ftc: string };
  tax_payable: string;
  currency: string;
};

export function useTax() {
  const latest = useQuery({
    queryKey: ["tax", "latest"],
    queryFn: async () => {
      const res = await getLatestTaxLatestGet({ throwOnError: true });
      return res.data as TaxResult | null;
    },
    retry: false,
  });

  const compute = useMutation({
    mutationFn: async (year?: string) => {
      const res = await computeTaxTaxComputePost({
        query: year ? { year } : undefined,
        throwOnError: true,
      });
      return res.data as TaxResult;
    },
  });

  return { latest, compute };
}
