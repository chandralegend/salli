import { cn } from "@/lib/utils";
import { MoneyText } from "@/components/shared/MoneyText";

export type ReportLine = { label: string; value: string; code?: string };

/**
 * Statement-style line list in a bordered card: a titled header, one row per
 * line (optional account code · name), and a totals footer. Shared by the
 * Balance Sheet and Income Statement tabs.
 */
export function ReportSection({
  title,
  lines,
  total,
  totalLabel,
  accent = false,
}: {
  title: string;
  lines: ReportLine[];
  total?: string;
  totalLabel?: string;
  /** Emerald edge on the first line — used for the asset / income sections. */
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="border-b px-5 py-3">
        <h3 className="text-[15px] font-semibold capitalize">{title}</h3>
      </div>
      <div className="px-5">
        {lines.map((line, i) => (
          <div
            key={`${line.code ?? ""}-${line.label}-${i}`}
            className="flex items-center gap-3 border-b last:border-b-0 py-2.5"
          >
            <span
              className={cn(
                "h-7 w-[3px] rounded-full shrink-0",
                accent && i === 0 ? "bg-[var(--status-success-text)]" : "bg-border"
              )}
            />
            <span className="flex-1 text-[13px] text-muted-foreground">
              {line.code ? (
                <>
                  <span className="font-mono text-xs text-muted-foreground/80">{line.code}</span>
                  {" · "}
                </>
              ) : null}
              {line.label}
            </span>
            <MoneyText value={line.value} decimals={0} className="text-[13px] text-foreground" />
          </div>
        ))}
      </div>
      {total !== undefined && (
        <div className="flex items-center justify-between bg-muted/40 px-5 py-3 border-t">
          <span className="text-[13px] font-semibold capitalize text-muted-foreground">
            {totalLabel ?? `Total ${title}`}
          </span>
          <MoneyText value={total} decimals={0} className="text-sm font-semibold" />
        </div>
      )}
    </div>
  );
}
