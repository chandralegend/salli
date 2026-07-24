import { cn } from "@/lib/utils";
import type { TaxResult } from "@/hooks/useTax";

const CREDIT_INFO: { key: "apit" | "ait" | "ftc"; label: string; explainer: string }[] = [
  { key: "apit", label: "APIT", explainer: "Advance Personal Income Tax withheld by your employer" },
  { key: "ait", label: "AIT", explainer: "Advance Income Tax withheld on interest income" },
  { key: "ftc", label: "FTC", explainer: "Foreign Tax Credit on overseas income" },
];

/** Navy emphasis panel — plain-language credit explanations, unused credits dimmed. */
export function CreditsPanel({ tax }: { tax: TaxResult }) {
  return (
    <div className="rounded-lg bg-primary text-white p-5 flex flex-col">
      <h3 className="text-[15px] font-semibold mb-3">Credits Applied</h3>
      <div className="space-y-2.5 flex-1">
        {CREDIT_INFO.map(({ key, label, explainer }) => {
          const amount = tax.credits[key];
          const unused = amount === "0.00";
          return (
            <div key={key} className={cn("rounded-md bg-white/[0.08] p-3.5", unused && "opacity-40")}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{label}</span>
                <span className="money text-sm">{unused ? "—" : `(${amount})`}</span>
              </div>
              <p className="text-xs text-white/60 mt-1">{explainer}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between rounded-md bg-[var(--status-success-bg)] px-3.5 py-2.5">
        <span className="text-sm font-semibold text-primary">Net Payable</span>
        <span className="money text-sm font-semibold text-primary">{tax.tax_payable}</span>
      </div>
    </div>
  );
}
