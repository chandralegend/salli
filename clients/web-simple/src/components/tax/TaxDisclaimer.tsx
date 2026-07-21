import { TriangleAlert } from "lucide-react";

/** Mandatory on the Tax screen — both empty and computed states. */
export function TaxDisclaimer() {
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-[var(--status-warning-bg)] px-4 py-3">
      <TriangleAlert className="size-4 shrink-0 mt-0.5 text-[var(--status-warning-text)]" />
      <p className="text-[13px] leading-relaxed text-[var(--status-warning-text)]">
        Planning estimate only. Numbers come from the deterministic rules engine — the AI never
        computes tax. Consult a registered tax agent before filing with the IRD.
      </p>
    </div>
  );
}
