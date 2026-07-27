import { cn } from "@/lib/utils";
import type { TaxResult } from "@/hooks/useTax";

/** Progressive bands — bands that received income get a quiet emerald edge. */
export function BandsTable({ tax }: { tax: TaxResult }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold">Progressive Bands</h3>
        <p className="text-xs text-muted-foreground">YA {tax.year} resident rates</p>
      </div>
      <div className="space-y-2">
        {tax.bands.map((b, i) => {
          const active = b.taxable_in_band !== "0.00";
          const total = Number(tax.taxable_income.replace(/,/g, "")) || 0;
          const pct =
            total > 0
              ? Math.min(100, (Number(b.taxable_in_band.replace(/,/g, "")) / total) * 100)
              : 0;
          return (
            <div
              key={i}
              className={cn(
                "rounded-md border p-3",
                active && "border-l-[3px] border-l-[var(--status-success-text)]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium">{b.band}</span>
                <div className="flex items-center gap-2">
                  <span className="money text-sm font-semibold">{b.rate}</span>
                  {active && (
                    <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--status-success-text)]">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground money">
                <span>{active ? `${b.taxable_in_band} in band` : "no income in band"}</span>
                <span>{b.tax}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-sm font-semibold">Total</span>
        <span className="money text-sm font-semibold">{tax.total_tax}</span>
      </div>
    </div>
  );
}
