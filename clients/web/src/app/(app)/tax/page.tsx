"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Globe, AlertTriangle, TrendingUp, ShieldCheck, Calculator } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTax } from "@/hooks/useTax";
import { PageShell, PageHeader, PillButton, BentoTile, CardContainer } from "@/components/ui/page-shell";
import { IconBadge, BarsWatermark, LandmarkWatermark } from "@/components/ui/card-watermarks";

function parse(s: string) {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

export default function TaxPage() {
  const { latest, compute } = useTax();
  const [result, setResult] = useState<typeof compute.data>(undefined);
  const displayResult = result ?? compute.data ?? latest.data ?? null;

  const hasFsi = displayResult && parse(displayResult.foreign_service_income) > 0;

  async function handleCompute() {
    const r = await compute.mutateAsync(undefined);
    setResult(r);
  }

  const effectiveRate = displayResult
    ? ((parse(displayResult.tax_payable) / parse(displayResult.gross_income)) * 100).toFixed(1)
    : null;

  if (latest.isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-12 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          <Skeleton className="col-span-2 h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Tax"
        subtitle="Sri Lanka individual income tax · Assessment Year 2025/26 · IRD"
        className="mb-8"
        actions={
          displayResult ? (
            <PillButton onClick={handleCompute} disabled={compute.isPending} variant="secondary">
              {compute.isPending ? <Loader2 className="inline w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="inline w-4 h-4 mr-1.5" />}
              Recompute
            </PillButton>
          ) : undefined
        }
      />

      {/* Empty state */}
      {!displayResult && (
        <div className="flex justify-center items-center min-h-[480px]">
          <div className="text-center max-w-[460px]">
            <div className="w-20 h-20 bg-[#E8FC85] rounded-[24px] flex items-center justify-center mx-auto mb-7">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#010001" strokeWidth="2">
                <line x1="30" y1="6" x2="6" y2="30" />
                <circle cx="9" cy="9" r="4" />
                <circle cx="27" cy="27" r="4" />
              </svg>
            </div>
            <h2 className="text-[26px] font-black tracking-[-0.04em] mb-2 text-foreground">Compute your tax</h2>
            <p className="text-[14px] text-muted-foreground leading-[1.7] mb-3">
              Salli&apos;s deterministic rules engine — not the AI — computes your liability from your ledger data.
            </p>
            <div className="badge-warning rounded-[14px] px-4 py-3.5 text-[13px] text-left mb-7 leading-relaxed">
              Planning estimate only. Consult a registered tax agent before filing with the IRD.
            </div>
            <button
              onClick={handleCompute}
              disabled={compute.isPending}
              className="px-9 py-[14px] bg-[#010001] text-white border-none rounded-full text-[15px] font-extrabold cursor-pointer hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {compute.isPending && <Loader2 className="size-4 animate-spin" />}
              Compute Tax
            </button>
            {compute.error && (
              <p className="text-[12px] text-rose-600 mt-3">{String(compute.error)}</p>
            )}
          </div>
        </div>
      )}

      {/* Computed: 4-column bento grid */}
      {displayResult && (
        <div className="grid grid-cols-4 gap-3">

          {/* ── Row 1: 4 metric tiles ── */}

          <BentoTile
            variant="green"
            label="Gross Income"
            sub={hasFsi ? "Employment + FSI + Other" : "Employment + Other"}
            value={displayResult.gross_income}
            badge={displayResult.currency}
            icon={<IconBadge><TrendingUp className="size-4 text-white" /></IconBadge>}
            watermark={<BarsWatermark />}
          />

          <BentoTile
            variant="blueGrey"
            label="Personal Relief"
            sub="Statutory deduction"
            value={`(${displayResult.personal_relief})`}
            badge={`${displayResult.currency} deducted`}
            icon={<IconBadge><ShieldCheck className="size-4 text-white" /></IconBadge>}
          />

          <BentoTile
            variant="card"
            label="Taxable Income"
            sub="After all reliefs"
            value={displayResult.taxable_income}
            badge={displayResult.currency}
            icon={<IconBadge><Calculator className="size-4 text-foreground" /></IconBadge>}
          />

          <BentoTile
            variant="gold"
            label="Tax Payable"
            sub="Net · due Jul 31, 2025"
            value={displayResult.tax_payable}
            badge={effectiveRate ? `${effectiveRate}% effective rate` : undefined}
            watermark={<LandmarkWatermark />}
          />

          {/* ── Row 2 ── */}

          {/* Computation workings — cols 1-2 */}
          <div className="col-span-2 glass-surface rounded-[var(--radius-panel)] p-[26px]">
            <div className="text-[14px] font-extrabold tracking-[-0.02em] mb-5">Computation</div>
            <div className="flex flex-col">
              {/* Income sources */}
              {hasFsi && (
                <>
                  <Row label="Regular Income" value={displayResult.regular_income} currency={displayResult.currency} />
                  <Row label="Foreign Service Income" value={displayResult.foreign_service_income} currency={displayResult.currency} />
                </>
              )}
              <Row label="Gross Income" value={displayResult.gross_income} currency={displayResult.currency} strong thick />
              <Row label="Less: Personal Relief" value={`(${displayResult.personal_relief})`} currency={displayResult.currency} green />
              <Row label="Taxable Income" value={displayResult.taxable_income} currency={displayResult.currency} strong />
              <Row label="Tax on progressive bands" value={displayResult.total_tax} currency={displayResult.currency} />
              {parse(displayResult.credits.apit) > 0 && (
                <Row label="Less: APIT Credit" value={`(${displayResult.credits.apit})`} currency={displayResult.currency} green />
              )}
              {parse(displayResult.credits.ait) > 0 && (
                <Row label="Less: AIT Credit" value={`(${displayResult.credits.ait})`} currency={displayResult.currency} green />
              )}
              {parse(displayResult.credits.ftc) > 0 && (
                <Row label="Less: FTC" value={`(${displayResult.credits.ftc})`} currency={displayResult.currency} green />
              )}
            </div>
            {/* Net Tax Payable — lime row */}
            <div className="flex justify-between items-center px-[18px] py-[14px] bg-[#E8FC85] rounded-[14px] mt-4">
              <span className="text-[14px] font-black text-[#010001]">Net Tax Payable</span>
              <span className="text-[14px] font-black text-[#010001] font-mono tabular-nums">
                {displayResult.tax_payable} {displayResult.currency}
              </span>
            </div>
          </div>

          {/* Credits — col 3, dark */}
          <div className="bg-[#010001] rounded-[20px] p-[26px]">
            <div className="text-[14px] font-extrabold text-white mb-5">Credits Applied</div>
            <div className="flex flex-col gap-2.5">
              <CreditItem
                label="APIT"
                sub="Advance Personal Income Tax withheld by employer"
                value={displayResult.credits.apit}
                currency={displayResult.currency}
                active={parse(displayResult.credits.apit) > 0}
              />
              <CreditItem
                label="AIT"
                sub="Advance Income Tax on interest income"
                value={displayResult.credits.ait}
                currency={displayResult.currency}
                active={parse(displayResult.credits.ait) > 0}
              />
              <CreditItem
                label="FTC"
                sub="Foreign Tax Credit"
                value={displayResult.credits.ftc}
                currency={displayResult.currency}
                active={parse(displayResult.credits.ftc) > 0}
              />
            </div>
            <div className="flex justify-between items-center px-4 py-[14px] bg-[#E8FC85] rounded-[14px] mt-4">
              <span className="text-[14px] font-black text-[#010001]">Net Payable</span>
              <span className="text-[14px] font-black text-[#010001] font-mono tabular-nums">{displayResult.tax_payable}</span>
            </div>
          </div>

          {/* Progressive Bands — col 4 */}
          <div className="bg-card rounded-[20px] p-[26px]">
            <div className="text-[14px] font-extrabold tracking-[-0.02em] mb-5">Progressive Bands</div>
            <div className="flex flex-col gap-1.5">
              {displayResult.bands.map((b, i) => {
                const active = parse(b.taxable_in_band) > 0;
                return (
                  <div
                    key={i}
                    className={`flex justify-between items-center px-3 py-2.5 rounded-[10px] ${
                      active ? "bg-[#D5E9EA] dark:bg-teal-400/12" : "bg-muted"
                    }`}
                  >
                    <div>
                      <div className={`text-[12px] font-bold ${active ? "text-[#010001] dark:text-teal-200" : "text-foreground"}`}>{b.band}</div>
                      <div className={`text-[11px] mt-0.5 ${active ? "text-black/45 dark:text-teal-200/60" : "text-muted-foreground"}`}>
                        {parse(b.taxable_in_band) > 0 ? `${displayResult.currency} ${b.taxable_in_band} in band` : "Nil band"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[13px] font-extrabold ${active ? "text-[#010001] dark:text-teal-200" : "text-muted-foreground"}`}>{b.rate}</div>
                      <div className={`text-[11px] ${active ? "text-black/45 dark:text-teal-200/60" : "text-muted-foreground"}`}>
                        {parse(b.tax) > 0 ? b.tax : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Total row */}
              <div className="flex justify-between items-center px-3 py-2.5 bg-[#E8FC85] rounded-[10px] mt-1">
                <span className="text-[13px] font-black text-[#010001]">Total</span>
                <span className="text-[13px] font-black text-[#010001] font-mono tabular-nums">{displayResult.total_tax}</span>
              </div>
            </div>
          </div>

          {/* ── Row 3: Disclaimer — full width ── */}
          <div className="col-span-4 flex items-center gap-2.5 px-[18px] py-3 badge-warning rounded-[14px]">
            <AlertTriangle className="size-[15px] text-amber-700 dark:text-amber-300 shrink-0" />
            <span className="text-[13px] leading-relaxed">
              Planning estimate only. Numbers from the deterministic rules engine — the AI never computes tax.
              Consult a registered tax agent before filing with the IRD.
            </span>
          </div>

          {/* FSI breakdown — only if FSI exists */}
          {hasFsi && (
            <div className="col-span-4 bg-card rounded-[20px] p-[26px]">
              <div className="flex items-center gap-2 mb-5">
                <Globe className="size-4 text-blue-500" />
                <div className="text-[14px] font-extrabold tracking-[-0.02em]">Foreign Service Income Regime</div>
                <span className="text-[11px] text-muted-foreground ml-1">15% final tax — remitted via a licensed Sri Lankan bank</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">Income Split</p>
                  <Row label="Total gross income" value={displayResult.gross_income} currency={displayResult.currency} />
                  <Row label="Regular income (progressive bands)" value={displayResult.regular_income} currency={displayResult.currency} />
                  <Row label="Foreign service income (15% flat)" value={displayResult.foreign_service_income} currency={displayResult.currency} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">Tax Computation</p>
                  <Row label="FSI tax at 15% flat" value={displayResult.fsi_tax} currency={displayResult.currency} />
                  <Row label="Tax before credits" value={displayResult.total_tax} currency={displayResult.currency} strong />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({
  label, value, currency, strong = false, green = false, thick = false,
}: {
  label: string; value: string; currency: string;
  strong?: boolean; green?: boolean; thick?: boolean;
}) {
  return (
    <div className={`flex justify-between py-[11px] ${thick ? "border-b-2 border-foreground" : "border-b border-border"} last:border-0`}>
      <span className={`text-[13.5px] ${strong ? "font-extrabold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`text-[13.5px] font-bold tabular-nums font-mono ${green ? "text-emerald-600" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function CreditItem({
  label, sub, value, currency, active,
}: {
  label: string; sub: string; value: string; currency: string; active: boolean;
}) {
  return (
    <div
      className="px-4 py-3.5 rounded-[14px]"
      style={{ background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", opacity: active ? 1 : 0.5 }}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[13.5px] font-bold text-white">{label}</span>
        <span className={`text-[13.5px] font-extrabold tabular-nums font-mono ${active ? "text-[#E8FC85]" : "text-white/35"}`}>
          {active ? `(${value})` : "—"}
        </span>
      </div>
      <div className="text-[11.5px] text-white/38 leading-tight">{sub}</div>
    </div>
  );
}
