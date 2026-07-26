"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Info,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusChip } from "@/components/shared/StatusChip";
import { HoldingDialog, type AssetClass } from "@/components/portfolio/HoldingDialog";
import { AllocationChart, SLICE_COLORS, colorForClass } from "@/components/portfolio/AllocationChart";
import { usePortfolio, type Holding } from "@/hooks/usePortfolio";
import { formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function PortfolioPage() {
  const { holdings, summary, addHolding, updateHolding, deleteHolding } = usePortfolio();

  const [tab, setTab] = useState("holdings");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleting, setDeleting] = useState<Holding | null>(null);

  const allHoldings = useMemo(() => holdings.data ?? [], [holdings.data]);
  const allocation = useMemo(() => summary.data?.allocation ?? [], [summary.data]);
  const totalValue = Number(summary.data?.total_value ?? 0);
  const totalGain = Number(summary.data?.total_gain ?? 0);
  const gainUp = totalGain >= 0;

  const colors = useMemo(() => colorForClass(allocation), [allocation]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? allHoldings.filter(
          (h) => h.name.toLowerCase().includes(q) || h.symbol.toLowerCase().includes(q)
        )
      : allHoldings;
  }, [allHoldings, search]);

  const grouped = useMemo(
    () =>
      visible.reduce<Record<string, Holding[]>>((acc, h) => {
        (acc[h.asset_class] ??= []).push(h);
        return acc;
      }, {}),
    [visible]
  );

  const countByClass = useMemo(
    () =>
      allHoldings.reduce<Record<string, number>>((acc, h) => {
        acc[h.asset_class] = (acc[h.asset_class] ?? 0) + 1;
        return acc;
      }, {}),
    [allHoldings]
  );

  // Concentration: surface the largest single asset class only when it dominates
  // (>50%). Derived from real allocation — no advice engine.
  const concentrated = useMemo(() => {
    const top = [...allocation].sort(
      (a, b) => Number(b.pct_of_portfolio) - Number(a.pct_of_portfolio)
    )[0];
    return top && Number(top.pct_of_portfolio) > 0.5 ? top : null;
  }, [allocation]);

  const empty = allHoldings.length === 0;

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function submitHolding(data: {
    symbol: string;
    name: string;
    asset_class: AssetClass;
    cost_basis: number;
    current_value: number;
  }) {
    const close = () => {
      setDialogOpen(false);
      setEditing(null);
    };
    if (editing) {
      updateHolding.mutate({ id: editing.id, patch: data }, { onSuccess: close });
    } else {
      addHolding.mutate(data, { onSuccess: close });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        subtitle="Manually-declared holdings · no live market feed"
        actions={
          !empty ? (
            <Button onClick={openAdd}>
              <Plus className="size-4" /> Add holding
            </Button>
          ) : undefined
        }
      />

      {holdings.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : empty ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={Wallet}
            title="No holdings yet"
            body="Add your first holding to track value, cost basis and allocation."
            action={
              <Button size="sm" onClick={openAdd}>
                <Plus className="size-4" /> Add holding
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Value hero */}
          <div className="rounded-lg bg-[var(--emphasis)] text-white px-6 py-5">
            <p className="eyebrow text-white/60">Total portfolio value</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <p className="money text-[40px] leading-none font-semibold">
                LKR {formatMoney(summary.data?.total_value)}
              </p>
              <div className="flex items-center gap-3 text-[13px]">
                <span className="text-white/60">
                  Cost LKR {formatMoney(summary.data?.total_cost_basis)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold",
                    gainUp
                      ? "bg-[var(--status-success-text)]/20 text-[var(--status-success-text)]"
                      : "bg-[var(--status-danger-text)]/25 text-white"
                  )}
                >
                  {gainUp && <ArrowUpRight className="size-3.5" />}
                  {gainUp ? "+" : "-"}LKR {formatCompact(Math.abs(totalGain))} (
                  {(Number(summary.data?.total_gain_pct ?? 0) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="holdings">Holdings</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
            </TabsList>

            {/* ── Holdings ── */}
            <TabsContent value="holdings" className="mt-4 space-y-4">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search holdings…"
                  className="pl-8"
                />
              </div>

              {visible.length === 0 ? (
                <div className="rounded-lg border bg-card">
                  <EmptyState
                    icon={Search}
                    title="No matches"
                    body="Try a different name or symbol."
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(grouped).map(([assetClass, items]) => {
                    const color = colors[assetClass] ?? SLICE_COLORS[0];
                    return (
                      <div key={assetClass}>
                        <p className="eyebrow mb-2">{titleCase(assetClass)}</p>
                        <div className="rounded-lg border bg-card divide-y">
                          {items.map((h) => {
                            const gain = Number(h.current_value) - Number(h.cost_basis);
                            const cost = Number(h.cost_basis);
                            const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                            const share = totalValue > 0 ? Number(h.current_value) / totalValue : 0;
                            const up = gain >= 0;
                            return (
                              <div
                                key={h.id}
                                className="group flex items-center gap-3 p-3.5"
                              >
                                <span
                                  className="h-9 w-1 rounded-full shrink-0"
                                  style={{ backgroundColor: color }}
                                />
                                <div
                                  className="size-10 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${color}1F`, color }}
                                >
                                  <span className="text-[11px] font-bold">
                                    {h.symbol.slice(0, 4).toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{h.name}</p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {h.symbol.toUpperCase()} · {(share * 100).toFixed(0)}% of
                                    portfolio
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="money font-medium">
                                    LKR {formatMoney(h.current_value)}
                                  </p>
                                  <p
                                    className={cn(
                                      "money text-[12px]",
                                      up
                                        ? "text-[var(--status-success-text)]"
                                        : "text-[var(--status-danger-text)]"
                                    )}
                                  >
                                    {up ? "+" : "-"}LKR {formatCompact(Math.abs(gain))} (
                                    {up ? "+" : ""}
                                    {gainPct.toFixed(1)}%)
                                  </p>
                                </div>
                                <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Edit holding"
                                    onClick={() => {
                                      setEditing(h);
                                      setDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Delete holding"
                                    onClick={() => setDeleting(h)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Allocation ── */}
            <TabsContent value="allocation" className="mt-4 space-y-4">
              {allocation.length === 0 ? (
                <div className="rounded-lg border bg-card">
                  <EmptyState
                    icon={PieChartIcon}
                    title="No allocation yet"
                    body="Allocation appears once your holdings carry a current value."
                  />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
                    {/* Donut + legend */}
                    <div className="rounded-lg border bg-card p-5">
                      <p className="eyebrow mb-2">Allocation by asset class</p>
                      <AllocationChart
                        allocation={allocation}
                        colors={colors}
                        totalLabel={`LKR ${formatCompact(totalValue)}`}
                      />
                      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {allocation.map((a) => (
                          <span
                            key={a.asset_class}
                            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
                          >
                            <span
                              className="size-2.5 rounded-sm"
                              style={{ backgroundColor: colors[a.asset_class] }}
                            />
                            {titleCase(a.asset_class)}{" "}
                            {(Number(a.pct_of_portfolio) * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Per-asset-class cards */}
                    <div className="space-y-2.5">
                      {allocation.map((a) => {
                        const color = colors[a.asset_class] ?? SLICE_COLORS[0];
                        const count = countByClass[a.asset_class] ?? 0;
                        const items = allHoldings.filter(
                          (h) => h.asset_class === a.asset_class
                        );
                        const cost = items.reduce((s, h) => s + Number(h.cost_basis), 0);
                        const gain = Number(a.current_value) - cost;
                        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                        const up = gain >= 0;
                        const pct = Number(a.pct_of_portfolio) * 100;
                        return (
                          <div key={a.asset_class} className="rounded-lg border bg-card p-4">
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="size-8 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: `${color}1F` }}
                                >
                                  <span
                                    className="size-3 rounded-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                </span>
                                <div>
                                  <p className="font-medium">{titleCase(a.asset_class)}</p>
                                  <p className="text-[12px] text-muted-foreground">
                                    {count} {count === 1 ? "holding" : "holdings"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="money font-semibold">
                                  LKR {formatMoney(a.current_value)}
                                </p>
                                <p
                                  className="text-[12px] font-semibold"
                                  style={{ color }}
                                >
                                  {pct.toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            <p className="mt-2 text-[12px] text-muted-foreground">
                              Unrealized gain{" "}
                              <span
                                className={cn(
                                  "money font-medium",
                                  up
                                    ? "text-[var(--status-success-text)]"
                                    : "text-[var(--status-danger-text)]"
                                )}
                              >
                                {up ? "+" : "-"}LKR {formatCompact(Math.abs(gain))}
                                {cost > 0 ? ` (${up ? "+" : ""}${gainPct.toFixed(1)}%)` : ""}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Concentration note — only when one class dominates */}
                  {concentrated && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                      <TriangleAlert className="size-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[13px] text-muted-foreground">
                        <span className="font-semibold text-primary">
                          {(Number(concentrated.pct_of_portfolio) * 100).toFixed(0)}% in{" "}
                          {titleCase(concentrated.asset_class).toLowerCase()}
                        </span>{" "}
                        — a single asset class is a large share of this portfolio.
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="flex items-center gap-2.5 rounded-lg border bg-muted/40 px-4 py-3">
                    <Info className="size-4 text-muted-foreground shrink-0" />
                    <p className="text-[13px] text-muted-foreground">
                      Values are manually entered · no live market feed.
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Dialogs */}
      <HoldingDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        holding={editing}
        onSubmit={submitHolding}
        pending={addHolding.isPending || updateHolding.isPending}
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete holding?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `“${deleting.name} (${deleting.symbol.toUpperCase()})” ` : ""}
              will be permanently removed from your portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteHolding.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
