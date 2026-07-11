import { useQuery, useMutation } from "@tanstack/react-query";
import { getLatestTaxLatestGet, computeTaxTaxComputePost } from "@/lib/api/sdk.gen";

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
  fsi_tax: string;
  total_tax: string;
  credits: { apit: string; ait: string; ftc: string };
  tax_payable: string;
  bands: TaxBand[];
  currency: string;
};

function fmt(n: string | number | null | undefined): string {
  if (n == null) return "0.00";
  const num = parseFloat(String(n));
  return isNaN(num) ? "0.00" : num.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Normalize raw API response (both /compute and /latest.result shapes) → TaxResult
// The API returns pre-formatted band strings: {band: "LKR 0 – LKR 1,000,000", rate: "6%"}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: Record<string, any> | null | undefined): TaxResult {
  if (!raw) throw new Error("Tax computation returned no data");
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
    fsi_tax: fmt(raw.fsi_tax),
    total_tax: fmt(raw.tax_before_credits),
    credits: {
      apit: fmt(raw.apit_credit),
      ait: fmt(raw.ait_credit),
      ftc: fmt(raw.foreign_tax_credit),
    },
    tax_payable: fmt(raw.tax_payable),
    bands,
    currency: "LKR",
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
    mutationFn: async (_year?: string) => {
      const res = await computeTaxTaxComputePost();
      if (res.error) {
        const msg = typeof res.error === "object" && res.error && "detail" in res.error
          ? String((res.error as { detail?: unknown }).detail)
          : "Failed to compute tax";
        throw new Error(msg);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = res.data as any;
      const inner = raw?.result ?? raw;
      return normalize(inner);
    },
  });

  return { latest, compute };
}
