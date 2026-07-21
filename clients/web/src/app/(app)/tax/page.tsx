"use client";

import { Calculator, Globe, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusChip } from "@/components/shared/StatusChip";
import { ComputationPanel } from "@/components/tax/ComputationPanel";
import { CreditsPanel } from "@/components/tax/CreditsPanel";
import { BandsTable } from "@/components/tax/BandsTable";
import { TaxDisclaimer } from "@/components/tax/TaxDisclaimer";
import { useTax } from "@/hooks/useTax";

/** Display-only effective rate — never feeds back into any figure. */
function effectiveRate(payable: string, gross: string): string | null {
  const p = Number(payable.replace(/,/g, ""));
  const g = Number(gross.replace(/,/g, ""));
  if (!isFinite(p) || !isFinite(g) || g <= 0) return null;
  return `${((p / g) * 100).toFixed(1)}% effective rate`;
}

export default function TaxPage() {
  const { latest, compute } = useTax();
  const tax = latest.data;

  const recompute = () => compute.mutate(undefined, { onSuccess: () => latest.refetch() });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax"
        subtitle="Sri Lanka individual income tax · Assessment Year 2025/26 · IRD"
        actions={
          tax ? (
            <Button variant="outline" onClick={recompute} disabled={compute.isPending}>
              {compute.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Recompute
            </Button>
          ) : undefined
        }
      />

      {latest.isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !tax ? (
        <div className="max-w-[560px] mx-auto rounded-lg border bg-card p-12 text-center">
          <div className="size-14 rounded-lg bg-muted mx-auto flex items-center justify-center">
            <Calculator className="size-7 text-muted-foreground" />
          </div>
          <h2 className="text-[22px] font-semibold mt-5">Compute your tax</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Salli&apos;s deterministic engine reads your posted ledger and applies the YA 2025/26
            rules — personal relief, progressive bands, and your APIT, AIT, and foreign tax
            credits. Nothing is estimated by AI.
          </p>
          <Button className="mt-6" onClick={recompute} disabled={compute.isPending}>
            {compute.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Computing…
              </>
            ) : (
              "Compute now"
            )}
          </Button>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Gross Income"
              value={tax.gross_income}
              caption={tax.foreign_service_income !== "0.00" ? "Employment + FSI + Other" : "all income sources"}
            />
            <StatCard label="Personal Relief" value={`(${tax.personal_relief})`} caption="Statutory deduction · YA 2025/26" />
            <StatCard label="Taxable Income" value={tax.taxable_income} caption="After all reliefs" />
            <StatCard
              label="Tax Payable"
              value={tax.tax_payable}
              className="border-2 border-foreground"
              badge={
                effectiveRate(tax.tax_payable, tax.gross_income) ? (
                  <StatusChip tone="info">{effectiveRate(tax.tax_payable, tax.gross_income)}</StatusChip>
                ) : undefined
              }
              caption="Net · due Jul 31"
            />
          </div>

          {/* Panels */}
          <div className="grid lg:grid-cols-[5fr_4fr_4fr] gap-4 items-start">
            <ComputationPanel tax={tax} />
            <CreditsPanel tax={tax} />
            <BandsTable tax={tax} />
          </div>

          {/* FSI regime — only when foreign service income exists */}
          {tax.foreign_service_income !== "0.00" && (
            <div className="rounded-lg border border-l-[3px] border-l-[var(--status-warning-text)] bg-card p-5 flex flex-wrap items-center gap-4">
              <div className="size-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Globe className="size-4.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-64">
                <h3 className="text-[15px] font-semibold">Foreign Service Income Regime</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  LKR {tax.foreign_service_income} of foreign service income remitted through a Sri
                  Lankan bank qualifies for the 15% final rate instead of progressive bands.
                </p>
              </div>
              <div className="text-right">
                <p className="eyebrow">FSI tax</p>
                <p className="money text-lg font-semibold">{tax.fsi_tax}</p>
              </div>
            </div>
          )}
        </>
      )}

      <TaxDisclaimer />
    </div>
  );
}
