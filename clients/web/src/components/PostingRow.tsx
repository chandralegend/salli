import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PostingRowProps {
  date: string;
  description: string;
  account?: string;
  amount: string;
  isCredit: boolean;
  currency?: string;
}

export function PostingRow({
  date,
  description,
  account,
  amount,
  isCredit,
  currency = "LKR",
}: PostingRowProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0 hover:bg-secondary/50 px-4 -mx-4 rounded-lg transition-colors">
      <span className="font-mono text-[13px] text-muted-foreground w-24 shrink-0">
        {date}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{description}</p>
        {account && (
          <p className="text-xs text-muted-foreground truncate">{account}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-mono shrink-0",
          isCredit
            ? "border-income/30 text-income bg-income/10"
            : "border-expense/30 text-expense bg-expense/10"
        )}
      >
        {isCredit ? "CR" : "DR"}
      </Badge>
      <span
        className={cn(
          "font-mono font-semibold text-sm w-28 text-right shrink-0",
          isCredit ? "text-income" : "text-expense"
        )}
      >
        {currency} {amount}
      </span>
    </div>
  );
}
