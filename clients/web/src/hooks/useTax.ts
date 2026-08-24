"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getLatestTaxLatestGet,
  computeTaxTaxComputePost,
  listPacksTaxPacksGet,
} from "@/lib/api/sdk.gen";

export type TaxBand = {
  band: string;
  rate: string;
  taxable_in_band: string;
  tax: string;
};

export type TaxResult = {
  year: string;
  gross_income: string;
  foreign_service_income: string;
  regular_income: string;
  taxable_income: string;
  personal_relief: string;
  qp_deduction: string;
  fsi_tax: string;
  total_tax: string;
  credits: { apit: string; ait: string; ftc: string };
  tax_payable: string;
  /** Credits in excess of the liability — money owed back to the taxpayer. */
  refund_due: string;
  bands: TaxBand[];
  currency: string;
  pack_country: string;
  rounding: string;
};

/** A versioned tax pack `(country, year, version)`. `return_due` is "MM-DD". */
export type TaxPack = {
  country: string;
  year: string;
  version: string;
  period_start: string;
  period_end: string;
  personal_relief: string;
  return_due: string;
};

export type TaxHistoryRow = { pack: TaxPack; result: TaxResult | null };

function fmt(n: string | number | null | undefined): string {
  if (n == null) return "0.00";
  const num = parseFloat(String(n));
  return isNaN(num) ? "0.00" : num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Normalize raw API response (both /compute and /latest.result shapes) → TaxResult
// The API now returns pre-formatted band strings: {band: "LKR 0 – LKR 1,000,000", rate: "6%"}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: Record<string, any>): TaxResult {
  const bands: TaxBand[] = (raw.band_workings ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b: Record<string, any>) => ({
      band: b.band ?? "—",
      rate: b.rate ?? "—",
      taxable_in_band: fmt(b.taxable_in_band),
      tax: fmt(b.tax),
    })
  );

  return {
    year: raw.pack_year ?? "—",
    gross_income: fmt(raw.gross_income),
    foreign_service_income: fmt(raw.foreign_service_income),
    regular_income: fmt(raw.regular_income),
    taxable_income: fmt(raw.taxable_income),
    personal_relief: fmt(raw.personal_relief_applied),
    qp_deduction: fmt(raw.qp_deduction),
    fsi_tax: fmt(raw.fsi_tax),
    total_tax: fmt(raw.tax_before_credits),
    credits: {
      apit: fmt(raw.apit_credit),
      ait: fmt(raw.ait_credit),
      ftc: fmt(raw.foreign_tax_credit),
    },
    tax_payable: fmt(raw.tax_payable),
    refund_due: fmt(raw.refund_due),
    bands,
    currency: "LKR",
    pack_country: raw.pack_country ?? "LK",
    rounding: raw.rounding ?? "nearest_rupee",
  };
}

export function useTax() {
  const latest = useQuery({
    queryKey: ["tax", "latest"],
    queryFn: async () => {
      const res = await getLatestTaxLatestGet();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = res.data as any;
      const raw = payload?.result ?? payload;
      if (!raw || !raw.pack_year) return null;
      return normalize(raw);
    },
    retry: false,
  });

  const compute = useMutation({
    mutationFn: async () => {
      const res = await computeTaxTaxComputePost();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = res.data as any;
      const inner = raw?.result ?? raw;
      return normalize(inner);
    },
  });

  return { latest, compute };
}

/** All versioned tax packs the engine knows about. */
export function useTaxPacks() {
  return useQuery({
    queryKey: ["tax", "packs"],
    queryFn: async () => {
      const res = await listPacksTaxPacksGet();
      return (res.data as unknown as TaxPack[]) ?? [];
    },
    retry: false,
  });
}

/** Per-assessment-year computations, one row per available pack (newest first).
 * There is no history endpoint, so we fetch the latest computation for each
 * pack year — only years with a real pack/computation appear (no fabrication). */
export function useTaxHistory() {
  return useQuery({
    queryKey: ["tax", "history"],
    queryFn: async (): Promise<TaxHistoryRow[]> => {
      const res = await listPacksTaxPacksGet();
      const packs = (res.data as unknown as TaxPack[]) ?? [];
      const rows = await Promise.all(
        packs.map(async (pack) => {
          const r = await getLatestTaxLatestGet({ query: { year: pack.year } });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const payload = r.data as any;
          const raw = payload?.result ?? payload;
          const result = raw && raw.pack_year ? normalize(raw) : null;
          return { pack, result };
        }),
      );
      return rows.sort((a, b) => (a.pack.year < b.pack.year ? 1 : -1));
    },
    retry: false,
  });
}
