"use client";

import { useState } from "react";
import { Calculator, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxBandTable } from "@/components/TaxBandTable";
import { MetricCard } from "@/components/MetricCard";
import { useTax } from "@/hooks/useTax";

export default function TaxPage() {
  const { latest, compute } = useTax();
  const [result, setResult] = useState<typeof compute.data>(undefined);

  const displayResult = result ?? compute.data ?? latest.data ?? null;

  async function handleCompute() {
    const r = await compute.mutateAsync(undefined);
    setResult(r);
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Tax</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sri Lanka individual income tax · YA 2025/26
        </p>
      </div>

      <Tabs defaultValue="compute">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="compute" className="data-[state=active]:bg-card">
            Compute
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-card">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compute">
          {!displayResult && (
            <div className="max-w-md">
              <div className="rounded-[16px] bg-card border border-border p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calculator className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Run Tax Computation
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Computes from your ledger data using the LK 2025/26 tax pack.
                  </p>
                </div>
                <Button
                  onClick={handleCompute}
                  disabled={compute.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {compute.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Compute Tax
                </Button>
                {compute.error && (
                  <p className="text-expense text-sm">
                    {String(compute.error)}
                  </p>
                )}
              </div>
            </div>
          )}

          {displayResult && (
            <div className="flex flex-col gap-6">
              {/* Disclaimer */}
              <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-[10px] px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning">
                  Not formal tax advice. This computation is indicative only.
                  Verify with a qualified tax professional before filing.
                  YA {displayResult.year}
                </p>
              </div>

              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                  label="Taxable Income"
                  value={`${displayResult.currency} ${displayResult.taxable_income}`}
                />
                <MetricCard
                  label="Personal Relief"
                  value={`${displayResult.currency} ${displayResult.personal_relief}`}
                  deltaPositive
                />
                <MetricCard
                  label="Net Taxable"
                  value={`${displayResult.currency} ${displayResult.net_taxable}`}
                />
                <MetricCard
                  label="Tax Payable"
                  value={`${displayResult.currency} ${displayResult.tax_payable}`}
                  delta="After credits"
                  deltaPositive={false}
                />
              </div>

              {/* Band table */}
              <div className="rounded-[16px] bg-card border border-border p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Tax Bands
                </h2>
                <TaxBandTable
                  bands={displayResult.bands}
                  total_tax={displayResult.total_tax}
                  currency={displayResult.currency}
                />
              </div>

              {/* Credits */}
              <div className="rounded-[16px] bg-card border border-border p-6">
                <h2 className="text-sm font-semibold text-foreground mb-4">
                  Credits
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                      APIT
                    </p>
                    <p className="font-mono text-lg font-semibold text-foreground mt-1">
                      {displayResult.currency} {displayResult.credits.apit}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                      AIT
                    </p>
                    <p className="font-mono text-lg font-semibold text-foreground mt-1">
                      {displayResult.currency} {displayResult.credits.ait}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                      FTC
                    </p>
                    <p className="font-mono text-lg font-semibold text-foreground mt-1">
                      {displayResult.currency} {displayResult.credits.ftc}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCompute}
                variant="outline"
                className="w-fit border-border text-muted-foreground hover:text-foreground"
                disabled={compute.isPending}
              >
                {compute.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Recompute
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-[16px] bg-card border border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Tax computation history will appear here after you compute your
              first return.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
