"use client";

import { useState } from "react";
import { Calculator, Loader2, AlertTriangle, RefreshCw, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxBandTable } from "@/components/TaxBandTable";
import { MetricCard } from "@/components/MetricCard";
import { useTax } from "@/hooks/useTax";

function LineItem({
  label,
  value,
  currency,
  indent = false,
  bold = false,
  positive = false,
  negative = false,
  divider = false,
}: {
  label: string;
  value: string;
  currency: string;
  indent?: boolean;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
  divider?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${divider ? "border-t mt-1 pt-3" : "border-b last:border-0"} ${indent ? "pl-4" : ""}`}>
      <p className={`text-[13px] ${bold ? "font-semibold" : "text-muted-foreground"}`}>{label}</p>
      <p className={`font-mono text-[13px] tabular-nums ${bold ? "font-bold" : ""} ${positive ? "text-emerald-700" : ""} ${negative ? "text-rose-600" : ""}`}>
        {negative ? "−" : ""}{currency} {value}
      </p>
    </div>
  );
}

export default function TaxPage() {
  const { latest, compute } = useTax();
  const [result, setResult] = useState<typeof compute.data>(undefined);
  const displayResult = result ?? compute.data ?? latest.data ?? null;

  const hasFsi = displayResult && parseFloat(displayResult.foreign_service_income.replace(/,/g, "")) > 0;

  async function handleCompute() {
    const r = await compute.mutateAsync(undefined);
    setResult(r);
  }

  if (latest.isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">Tax</h1>
          <p className="text-meta mt-1">Sri Lanka individual income tax · YA 2025/26</p>
        </div>
        {displayResult && (
          <Button variant="outline" size="sm" onClick={handleCompute} disabled={compute.isPending}>
            {compute.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Recompute
          </Button>
        )}
      </div>

      <Tabs defaultValue="compute">
        <TabsList className="mb-6">
          <TabsTrigger value="compute">Computation</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="bands">Tax Bands</TabsTrigger>
        </TabsList>

        <TabsContent value="compute">
          {!displayResult ? (
            <Card className="max-w-md">
              <CardContent className="p-10 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calculator className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">Compute Your Tax</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uses your ledger data with the LK 2025/26 tax pack to compute your liability.
                  </p>
                </div>
                <Button onClick={handleCompute} disabled={compute.isPending} className="w-full">
                  {compute.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Compute Tax
                </Button>
                {compute.error && (
                  <p className="text-sm text-destructive">{String(compute.error)}</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Disclaimer */}
              <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-lg px-4 py-3">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                <p className="text-[12px] leading-relaxed text-foreground/70">
                  Indicative only — not formal tax advice. Verify with a qualified tax professional before filing.
                  {" "}YA {displayResult.year}
                </p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "GROSS INCOME", value: displayResult.gross_income },
                  { label: "PERSONAL RELIEF", value: displayResult.personal_relief },
                  { label: "TAXABLE INCOME", value: displayResult.taxable_income },
                  { label: "TAX PAYABLE", value: displayResult.tax_payable, highlight: true },
                ].map(({ label, value, highlight }) => (
                  <MetricCard
                    key={label}
                    label={label}
                    value={`${displayResult.currency} ${value}`}
                    accent={highlight}
                  />
                ))}
              </div>

              {/* FSI Breakdown (only when FSI exists) */}
              {hasFsi && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      Foreign Service Income Regime
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-[11px] font-medium text-secondary-label mb-3 uppercase tracking-wider">Income Split</p>
                        <LineItem label="Total gross income" value={displayResult.gross_income} currency={displayResult.currency} />
                        <LineItem label="Regular income (progressive bands)" value={displayResult.regular_income} currency={displayResult.currency} indent />
                        <LineItem label="Foreign service income (15% flat)" value={displayResult.foreign_service_income} currency={displayResult.currency} indent />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-secondary-label mb-3 uppercase tracking-wider">Tax Computation</p>
                        <LineItem label="Band tax on regular income" value={
                          (parseFloat(displayResult.total_tax.replace(/,/g, "")) - parseFloat(displayResult.fsi_tax.replace(/,/g, ""))).toLocaleString("en-LK", { minimumFractionDigits: 2 })
                        } currency={displayResult.currency} />
                        <LineItem label="FSI tax at 15% flat" value={displayResult.fsi_tax} currency={displayResult.currency} />
                        <LineItem label="Tax before credits" value={displayResult.total_tax} currency={displayResult.currency} bold divider />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="credits">
          {!displayResult ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Run a computation first to see your tax credits.
              </p>
              <Button className="mt-4" onClick={handleCompute} disabled={compute.isPending}>
                {compute.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Compute Tax
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Credits Applied</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineItem label="APIT (Tax Withheld at Source)" value={displayResult.credits.apit} currency={displayResult.currency} />
                  <LineItem label="AIT (Advanced Income Tax on Interest)" value={displayResult.credits.ait} currency={displayResult.currency} />
                  <LineItem label="FTC (Foreign Tax Credit)" value={displayResult.credits.ftc} currency={displayResult.currency} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Liability Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineItem label="Tax Before Credits" value={displayResult.total_tax} currency={displayResult.currency} />
                  <LineItem label="Total Credits" value={
                    [displayResult.credits.apit, displayResult.credits.ait, displayResult.credits.ftc]
                      .reduce((s, v) => s + parseFloat(v.replace(/,/g, "")), 0)
                      .toLocaleString("en-LK", { minimumFractionDigits: 2 })
                  } currency={displayResult.currency} negative />
                  <div className="flex items-center justify-between pt-3 mt-1 border-t">
                    <p className="text-[13px] font-semibold">Net Tax Payable</p>
                    <p className="font-bold font-mono tabular-nums text-primary">
                      {displayResult.currency} {displayResult.tax_payable}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bands">
          {!displayResult ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Run a computation first to see tax band breakdown.
              </p>
              <Button className="mt-4" onClick={handleCompute} disabled={compute.isPending}>
                {compute.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Compute Tax
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Progressive Band Workings — YA {displayResult.year}
                  </CardTitle>
                  <p className="text-[12px] text-muted-foreground">
                    Applied to regular taxable income of {displayResult.currency} {displayResult.taxable_income} (excludes FSI)
                  </p>
                </CardHeader>
                <CardContent>
                  <TaxBandTable
                    bands={displayResult.bands}
                    total_tax={
                      (parseFloat(displayResult.total_tax.replace(/,/g, "")) - parseFloat(displayResult.fsi_tax.replace(/,/g, "")))
                        .toLocaleString("en-LK", { minimumFractionDigits: 2 })
                    }
                    currency={displayResult.currency}
                  />
                </CardContent>
              </Card>

              {hasFsi && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      Foreign Service Income Tax
                    </CardTitle>
                    <p className="text-[12px] text-muted-foreground">
                      15% final tax — remitted via a licensed Sri Lankan bank
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-0">
                      <LineItem label="Foreign service income" value={displayResult.foreign_service_income} currency={displayResult.currency} />
                      <LineItem label="Rate" value="15%" currency="" />
                      <LineItem label="FSI tax" value={displayResult.fsi_tax} currency={displayResult.currency} bold divider />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
