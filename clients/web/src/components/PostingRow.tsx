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
    <div className="flex items-center gap-4 py-2.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground w-20 shrink-0 tabular-nums font-mono">{date}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate leading-tight">{description}</p>
        {account && <p className="text-xs text-muted-foreground truncate mt-0.5">{account}</p>}
      </div>
      <div
        className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
          isCredit
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
            : "bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"
        }`}
      >
        {isCredit ? "CR" : "DR"}
      </div>
      <span
        className={`font-ledger text-[13px] font-medium w-28 text-right shrink-0 ${
          isCredit ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
        }`}
      >
        <span className="text-[0.78em] text-muted-foreground mr-1">{currency}</span>
        {amount}
      </span>
    </div>
  );
}
