import type { TaxPack, TaxResult } from "@/hooks/useTax";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The filing deadline as YYYY-MM-DD, derived from the pack's `return_due` ("MM-DD")
 * in the calendar year after the assessment year starts — AY 2025/26 → 2026. */
export function filingDueDate(pack: TaxPack | undefined, packYear: string): string {
  const filingYear = Number(packYear.split("/")[0]) + 1;
  const md = pack?.return_due && /^\d{2}-\d{2}$/.test(pack.return_due) ? pack.return_due : "11-30";
  return `${filingYear}-${md}`;
}

/** Human label for the filing deadline, e.g. "Due 30 Nov 2026". */
export function dueDateLabel(pack: TaxPack | undefined, packYear: string): string {
  const startYear = Number(packYear.split("/")[0]);
  const filingYear = startYear + 1;
  if (!Number.isFinite(filingYear)) return "";
  if (pack?.return_due && /^\d{2}-\d{2}$/.test(pack.return_due)) {
    const [mm, dd] = pack.return_due.split("-").map(Number);
    if (mm >= 1 && mm <= 12) return `Due ${dd} ${MONTHS[mm - 1]} ${filingYear}`;
  }
  return `Due 30 Nov ${filingYear}`;
}

/** Display-only effective rate as a fraction (payable / gross). */
export function effectiveRate(result: TaxResult): number {
  const p = Number(result.tax_payable.replace(/,/g, ""));
  const g = Number(result.gross_income.replace(/,/g, ""));
  if (!isFinite(p) || !isFinite(g) || g <= 0) return 0;
  return p / g;
}
