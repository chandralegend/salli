import { CreditCard, Landmark, Percent, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { StatCard } from "@/components/shared/StatCard";
import { StatusChip } from "@/components/shared/StatusChip";
import { TaxDisclaimer } from "@/components/tax/TaxDisclaimer";
import type { TaxResult } from "@/hooks/useTax";

function sum(...values: string[]): string {
  const total = values.reduce((acc, v) => acc + (Number(v.replace(/,/g, "")) || 0), 0);
  return total.toFixed(2);
}

/** One relief/credit row: quiet emerald edge + icon when applied, dimmed when inactive. */
function DeductionRow({
  icon: Icon,
  title,
  subtitle,
  amount,
  activeLabel,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  amount: string;
  activeLabel: string;
}) {
  const active = amount !== "0.00" && Number(amount.replace(/,/g, "")) > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-lg border bg-card p-4",
        active && "border-l-[3px] border-l-[var(--status-success-text)]",
        !active && "opacity-55",
      )}
    >
      <div
        className={cn(
          "size-9 shrink-0 rounded-md flex items-center justify-center",
          active ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="money text-sm font-semibold">{active ? `(${formatMoney(amount)})` : "—"}</p>
        <div className="mt-1 flex justify-end">
          <StatusChip tone={active ? "success" : "neutral"}>{active ? activeLabel : "Inactive"}</StatusChip>
        </div>
      </div>
    </div>
  );
}

/** Deductions & credits — mirrors the mobile Deductions tab. */
export function DeductionsTab({ tax }: { tax: TaxResult }) {
  const relief = tax.personal_relief;
  const { apit, ait, ftc } = tax.credits;
  const totalCredits = sum(apit, ait, ftc);
  const total = sum(relief, totalCredits);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Deductions & Credits"
          value={formatMoney(total)}
          caption="Reduces taxable income & tax due"
          emphasis
          className="sm:col-span-1"
        />
        <StatCard label="Relief (from income)" value={formatMoney(relief)} caption={`Statutory · YA ${tax.year}`} />
        <StatCard
          label="Credits (from tax)"
          value={formatMoney(totalCredits)}
          caption="APIT + AIT + FTC"
          badge={<StatusChip tone="success">applied to tax</StatusChip>}
        />
      </div>

      <section className="space-y-2.5">
        <p className="eyebrow">Personal Relief</p>
        <DeductionRow
          icon={User}
          title="Statutory Personal Relief"
          subtitle={`Auto-applied · YA ${tax.year}`}
          amount={relief}
          activeLabel="Active"
        />
      </section>

      <section className="space-y-2.5">
        <p className="eyebrow">Tax Credits</p>
        <div className="space-y-2.5">
          <DeductionRow
            icon={CreditCard}
            title="APIT · Employer Withholding"
            subtitle={apit !== "0.00" ? "Advance income tax on salary" : "No APIT withheld"}
            amount={apit}
            activeLabel="Applied"
          />
          <DeductionRow
            icon={Landmark}
            title="AIT · Bank Interest Tax"
            subtitle={ait !== "0.00" ? "Advance income tax on interest" : "No qualifying interest income"}
            amount={ait}
            activeLabel="Applied"
          />
          <DeductionRow
            icon={Percent}
            title="FTC · Foreign Tax Credit"
            subtitle={ftc !== "0.00" ? "Tax paid to a foreign authority" : "No foreign-taxed income"}
            amount={ftc}
            activeLabel="Applied"
          />
        </div>
      </section>

      <TaxDisclaimer />
    </div>
  );
}
