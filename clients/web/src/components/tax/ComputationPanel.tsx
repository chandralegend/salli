import { cn } from "@/lib/utils";
import type { TaxResult } from "@/hooks/useTax";

/** Parse a display-formatted money string ("744,000.00") to a number. */
export function money(v: string): number {
  return Number(String(v).replace(/,/g, "")) || 0;
}

function Row({
  label,
  value,
  bold = false,
  muted = false,
  rule = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  rule?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 border-b last:border-b-0",
        rule && "border-t-2 border-t-foreground/20",
        bold && "font-semibold"
      )}
    >
      <span className={cn("text-sm", muted && "text-muted-foreground")}>{label}</span>
      <span className="money text-sm">{value}</span>
    </div>
  );
}

/** Statement-style line list — top to bottom, exactly as the engine ran it. */
export function ComputationPanel({ tax }: { tax: TaxResult }) {
  const hasFsi = tax.foreign_service_income !== "0.00";
  // `total_tax` is tax BEFORE credits — progressive bands PLUS the FSI final tax.
  // Labelling it "Tax on progressive bands" made an FSI-heavy return show the same
  // figure twice under two headings, reading as double the real liability while
  // "Taxable Income 0.00" sat directly above it. Derive the bands-only figure so
  // the statement adds up top to bottom, which is what this panel promises.
  //
  // These arrive comma-formatted ("744,000.00"), so strip separators before
  // parsing — Number("744,000.00") is NaN.
  const bandsTax = (money(tax.total_tax) - money(tax.fsi_tax)).toFixed(2);
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold">Computation</h3>
        <p className="text-xs text-muted-foreground">top to bottom, exactly as the engine ran it</p>
      </div>
      <div>
        <Row label="Regular Income" value={tax.regular_income} />
        {hasFsi && <Row label="Foreign Service Income" value={tax.foreign_service_income} />}
        <Row label="Gross Income" value={tax.gross_income} bold rule />
        <Row label="Less: Personal Relief" value={`(${tax.personal_relief})`} muted />
        {tax.qp_deduction !== "0.00" && (
          <Row label="Less: Qualifying Payments" value={`(${tax.qp_deduction})`} muted />
        )}
        <Row label="Taxable Income" value={tax.taxable_income} bold />
        <Row label="Tax on progressive bands" value={bandsTax} />
        {hasFsi && tax.fsi_tax !== "0.00" && <Row label="FSI tax @ 15%" value={tax.fsi_tax} />}
        <Row label="Tax before credits" value={tax.total_tax} bold rule />
        <Row label="Less: APIT Credit" value={`(${tax.credits.apit})`} muted />
        <Row label="Less: AIT Credit" value={`(${tax.credits.ait})`} muted />
        <Row label="Less: Foreign Tax Credit" value={tax.credits.ftc === "0.00" ? "—" : `(${tax.credits.ftc})`} muted />
      </div>
      <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--status-success-bg)] px-4 py-3">
        <span className="text-[15px] font-semibold">Net Tax Payable</span>
        <span className="money text-[15px] font-semibold">
          {tax.tax_payable} {tax.currency}
        </span>
      </div>
    </div>
  );
}
