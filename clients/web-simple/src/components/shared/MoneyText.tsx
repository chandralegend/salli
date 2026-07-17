import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

/** A decimal-string money figure in tabular numerals. Never does arithmetic. */
export function MoneyText({
  value,
  prefix,
  decimals = 2,
  className,
}: {
  value: string | null | undefined;
  prefix?: string;
  decimals?: number;
  className?: string;
}) {
  return (
    <span className={cn("money", className)}>
      {prefix ? `${prefix} ` : ""}
      {formatMoney(value, decimals)}
    </span>
  );
}
