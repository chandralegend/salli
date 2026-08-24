import type { TaxPack } from "@/hooks/useTax";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Filing-deadline helpers, derived from the pack rather than written down.
 *
 * These used to live inside the Tax screen, so every other surface that wanted
 * a deadline hardcoded its own — and they drifted apart: the More hub said
 * "Sep 30", the web dashboard said "Jul 31", and the pack said 30 November.
 * Two of the three were simply wrong. Anything showing a filing date reads it
 * from here.
 */

/** Human label for the filing deadline, e.g. "Due 30 Nov 2026". */
export function dueDateLabel(pack: TaxPack | undefined, packYear: string): string {
  const startYear = Number(packYear.split("/")[0]);
  const filingYear = startYear + 1;
  if (!Number.isFinite(filingYear)) return "";
  if (pack?.return_due) {
    const [mm, dd] = pack.return_due.split("-").map(Number);
    if (Number.isFinite(mm) && Number.isFinite(dd) && mm >= 1 && mm <= 12) {
      return `Due ${dd} ${MONTHS[mm - 1]} ${filingYear}`;
    }
  }
  return `Due 30 Nov ${filingYear}`;
}

/** Short label for dense surfaces (stat cards), e.g. "30 Nov". */
export function dueDateShort(pack: TaxPack | undefined): string {
  if (pack?.return_due) {
    const [mm, dd] = pack.return_due.split("-").map(Number);
    if (Number.isFinite(mm) && Number.isFinite(dd) && mm >= 1 && mm <= 12) {
      return `${dd} ${MONTHS[mm - 1]}`;
    }
  }
  return "30 Nov";
}

/** The filing deadline as YYYY-MM-DD, for creating a reminder. */
export function filingDueDate(pack: TaxPack | undefined, packYear: string): string {
  const filingYear = Number(packYear.split("/")[0]) + 1;
  const md = pack?.return_due && /^\d{2}-\d{2}$/.test(pack.return_due) ? pack.return_due : "11-30";
  return `${filingYear}-${md}`;
}
