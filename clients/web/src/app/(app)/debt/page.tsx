"use client";

import { useMemo, useState } from "react";
import { CreditCard, Info, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { StatCard } from "@/components/shared/StatCard";
import { SectionLabel } from "@/components/shared/SectionLabel";
import { StatusChip } from "@/components/shared/StatusChip";
import { MoneyText } from "@/components/shared/MoneyText";
import { EntityCard } from "@/components/shared/EntityCard";
import { FilterChips } from "@/components/shared/FilterChips";
import { DebtDialog, type DebtFormValues } from "@/components/debt/DebtDialog";
import { StrategyToggle } from "@/components/debt/StrategyToggle";
import { BalanceChart } from "@/components/debt/BalanceChart";
import { useDebt, type Debt, type Strategy } from "@/hooks/useDebt";
import { formatMoney, formatCompact } from "@/lib/format";

const FILTERS = ["All", "Active", "Paid Off"] as const;
type Filter = (typeof FILTERS)[number];
const EXTRA_PRESETS = [0, 5000, 10000, 25000, 50000];

/** APR is a fraction (0.24); show it as a percent. */
function pct(fraction: string | number, dp = 1): string {
  const n = typeof fraction === "number" ? fraction : Number(fraction);
  if (!isFinite(n)) return "—";
  return `${(n * 100).toFixed(dp)}%`;
}

/** Debt-free month label derived from months-from-now (backend stores no date). */
function debtFreeLabel(months: number | null | undefined): string {
  if (months == null) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function DebtPage() {
  const [tab, setTab] = useState("overview");
  const [filter, setFilter] = useState<Filter>("All");
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [extra, setExtra] = useState(10000);
  const [showAllRows, setShowAllRows] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);

  const { debts, plan, basePlan, addDebt, updateDebt, deleteDebt } = useDebt(extra, strategy);

  const allDebts = useMemo(() => debts.data ?? [], [debts.data]);

  const totalOutstanding = allDebts.reduce((s, d) => s + Number(d.principal), 0);
  const totalMinPayment = allDebts.reduce((s, d) => s + Number(d.minimum_payment), 0);
  const totalMonths = plan.data?.months_to_payoff ?? null;

  const interestSaved =
    basePlan.data && plan.data
      ? Math.max(0, Number(basePlan.data.total_interest_paid) - Number(plan.data.total_interest_paid))
      : null;
  const monthsSaved =
    basePlan.data?.months_to_payoff != null && plan.data?.months_to_payoff != null
      ? basePlan.data.months_to_payoff - plan.data.months_to_payoff
      : null;

  const visibleDebts = allDebts.filter((d) => {
    if (filter === "Active" && !d.is_active) return false;
    if (filter === "Paid Off" && d.is_active) return false;
    return true;
  });

  // Priority order: avalanche = highest APR first, snowball = smallest balance first.
  const orderedDebts = useMemo(() => {
    const active = allDebts.filter((d) => d.is_active);
    return [...active].sort((a, b) =>
      strategy === "avalanche"
        ? Number(b.apr) - Number(a.apr)
        : Number(a.principal) - Number(b.principal)
    );
  }, [allDebts, strategy]);

  // Aggregate the per-debt-per-month schedule into one row per month.
  const monthlyRows = useMemo(() => {
    const map = new Map<number, { month: number; payment: number; interest: number; balance: number }>();
    for (const e of plan.data?.schedule ?? []) {
      const cur = map.get(e.month) ?? { month: e.month, payment: 0, interest: 0, balance: 0 };
      cur.payment += Number(e.payment);
      cur.interest += Number(e.interest_paid);
      cur.balance += Number(e.remaining_balance);
      map.set(e.month, cur);
    }
    return [...map.values()].sort((a, b) => a.month - b.month);
  }, [plan.data]);

  const balancePoints = useMemo(
    () => [
      { month: 0, balance: totalOutstanding },
      ...monthlyRows.map((r) => ({ month: r.month, balance: r.balance })),
    ],
    [monthlyRows, totalOutstanding]
  );

  const visibleRows = showAllRows ? monthlyRows : monthlyRows.slice(0, 12);
  const strategyLabel = strategy[0].toUpperCase() + strategy.slice(1);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(d: Debt) {
    setEditing(d);
    setDialogOpen(true);
  }
  function submitDebt(data: DebtFormValues) {
    const close = () => {
      setDialogOpen(false);
      setEditing(null);
    };
    if (editing) {
      updateDebt.mutate({ id: editing.id, body: data }, { onSuccess: close });
    } else {
      addDebt.mutate(data, { onSuccess: close });
    }
  }

  const empty = !debts.isLoading && allDebts.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debt"
        subtitle="Track loans and plan a payoff · avalanche or snowball"
        actions={
          <Button onClick={openAdd}>
            <Plus className="size-4" /> Add debt
          </Button>
        }
      />

      {debts.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : empty ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={CreditCard}
            title="No debts tracked"
            body="Add a loan to see a payoff plan — months to debt-free, interest saved, and an amortization schedule."
            action={
              <Button size="sm" variant="outline" onClick={openAdd}>
                Add your first debt
              </Button>
            }
          />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                emphasis
                label="Total Outstanding"
                value={`LKR ${formatCompact(totalOutstanding)}`}
                caption={`${allDebts.length} loan${allDebts.length === 1 ? "" : "s"} · ${strategyLabel}`}
              />
              <StatCard
                label="Monthly Minimum"
                value={`LKR ${formatCompact(totalMinPayment)}`}
                caption="across all debts"
              />
              <StatCard
                label="Months to Payoff"
                value={totalMonths ?? "—"}
                caption={totalMonths ? `${(totalMonths / 12).toFixed(1)} years` : "add a payment plan"}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
              <div className="inline-flex items-center gap-2">
                <SectionLabel>Strategy</SectionLabel>
                <StrategyToggle value={strategy} onChange={setStrategy} />
              </div>
            </div>

            {visibleDebts.length === 0 ? (
              <div className="rounded-lg border bg-card">
                <p className="p-6 text-sm text-muted-foreground">No debts match this filter.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {visibleDebts.map((d) => (
                  <EntityCard
                    key={d.id}
                    onClick={() => openEdit(d)}
                    dimmed={!d.is_active}
                    accent={d.is_active ? "accent" : "muted"}
                    icon={CreditCard}
                    iconTone={d.is_active ? "accent" : "muted"}
                    title={d.name}
                    titleChip={
                      d.is_active ? (
                        <StatusChip tone="info">Active</StatusChip>
                      ) : (
                        <StatusChip tone="success">Paid Off</StatusChip>
                      )
                    }
                    subtitle={`${pct(d.apr)} APR · Min LKR ${formatMoney(d.minimum_payment, 0)}/mo`}
                    value={`LKR ${formatMoney(d.principal, 0)}`}
                    valueMuted={!d.is_active}
                    trailing={
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit debt"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(d);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete debt"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(d);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}

            <p className="text-center text-[12px] text-muted-foreground">
              Planning estimate only · assumes fixed APR and on-time payments
            </p>
          </TabsContent>

          {/* ── Strategy ── */}
          <TabsContent value="strategy" className="mt-4 space-y-4">
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionLabel>Payoff Method</SectionLabel>
                <StrategyToggle value={strategy} onChange={setStrategy} />
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/[0.06] px-3.5 py-2.5">
                <Zap className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="text-[13px] leading-5 text-muted-foreground">
                  {strategy === "avalanche" ? (
                    <>
                      <span className="font-semibold text-primary">Avalanche</span> targets the highest APR
                      first — mathematically saves the most interest.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-primary">Snowball</span> clears the smallest balance
                      first — fastest early wins for momentum.
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="extra" className="eyebrow block">
                  Extra Monthly Payment
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <span className="money pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      LKR
                    </span>
                    <Input
                      id="extra"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1000"
                      value={extra}
                      onChange={(e) => setExtra(Math.max(0, Number(e.target.value) || 0))}
                      className="money w-44 pl-12"
                    />
                  </div>
                  <div className="inline-flex flex-wrap gap-1.5">
                    {EXTRA_PRESETS.map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={extra === p ? "default" : "outline"}
                        onClick={() => setExtra(p)}
                      >
                        {p === 0 ? "None" : `+${formatCompact(p)}`}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-[12px] text-muted-foreground">
                  On top of LKR {formatMoney(String(totalMinPayment), 0)} minimum across all debts.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                label="Months to Payoff"
                value={totalMonths ?? "—"}
                badge={
                  monthsSaved !== null && monthsSaved > 0 ? (
                    <StatusChip tone="success">−{monthsSaved} mo</StatusChip>
                  ) : undefined
                }
                caption={
                  basePlan.data?.months_to_payoff != null
                    ? `vs ${basePlan.data.months_to_payoff} at minimum`
                    : undefined
                }
              />
              <StatCard
                label="Total Interest"
                value={plan.data ? `LKR ${formatCompact(plan.data.total_interest_paid)}` : "—"}
                badge={
                  interestSaved !== null && interestSaved > 0 ? (
                    <StatusChip tone="success">saves LKR {formatCompact(interestSaved)}</StatusChip>
                  ) : undefined
                }
                caption={interestSaved !== null && interestSaved > 0 ? undefined : "with extra payments"}
              />
            </div>

            <div>
              <SectionLabel className="mb-2">Payoff Order · {strategyLabel}</SectionLabel>
              <div className="space-y-1.5">
                {orderedDebts.length === 0 ? (
                  <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
                    No active debts to sequence.
                  </div>
                ) : (
                  orderedDebts.map((d, i) => {
                    const focus = i === 0;
                    return (
                      <div
                        key={d.id}
                        className={
                          "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 " +
                          (focus ? "border-primary/30" : "opacity-70")
                        }
                      >
                        <div
                          className={
                            "flex size-7 items-center justify-center rounded-full text-xs font-bold " +
                            (focus ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                          }
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{d.name}</p>
                          <p className="text-[12px] text-muted-foreground">
                            APR {pct(d.apr)} · {focus ? "targeting now" : "minimum only"}
                          </p>
                        </div>
                        <div className="text-right">
                          <MoneyText value={d.principal} prefix="LKR" className="text-sm font-semibold" />
                          <div className="mt-0.5">
                            {focus ? (
                              <StatusChip tone="info">Focus</StatusChip>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Queued</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3.5 py-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">
                Planning estimate · assumes fixed APR &amp; on-time payments.
              </p>
            </div>
          </TabsContent>

          {/* ── Schedule ── */}
          <TabsContent value="schedule" className="mt-4 space-y-4">
            <div className="rounded-lg bg-[#0A2540] px-5 py-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow text-white/60">Debt-Free Date</p>
                  <p className="money mt-1 text-[30px] font-semibold leading-none">
                    {debtFreeLabel(totalMonths)}
                  </p>
                  <p className="mt-1.5 text-[12px] text-white/50">
                    {totalMonths != null
                      ? `${totalMonths} payments remaining`
                      : "Not paid off within horizon"}
                  </p>
                </div>
                <StatusChip tone="info">{strategyLabel}</StatusChip>
              </div>
              <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-[13px]">
                <div>
                  <p className="text-[11px] text-white/50">Balance now</p>
                  <p className="money font-semibold">LKR {formatCompact(totalOutstanding)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/50">Projected interest</p>
                  <p className="money font-semibold">
                    LKR {plan.data ? formatCompact(plan.data.total_interest_paid) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {balancePoints.length > 1 && (
              <div className="rounded-lg border bg-card p-5">
                <SectionLabel className="mb-3">Remaining Balance</SectionLabel>
                <BalanceChart points={balancePoints} />
              </div>
            )}

            <div className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b p-4">
                <SectionLabel>
                  {showAllRows
                    ? `Amortization · all ${monthlyRows.length}`
                    : `Amortization · first ${Math.min(12, monthlyRows.length)} of ${monthlyRows.length}`}
                </SectionLabel>
                {monthlyRows.length > 12 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowAllRows((v) => !v)}>
                    {showAllRows ? "Show less" : `Show all ${monthlyRows.length}`}
                  </Button>
                )}
              </div>
              {monthlyRows.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No schedule to display.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Month</TableHead>
                      <TableHead className="text-right">Payment</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((r) => (
                      <TableRow key={r.month}>
                        <TableCell className="font-medium">{r.month}</TableCell>
                        <TableCell className="text-right">
                          <MoneyText value={String(r.payment)} prefix="LKR" />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          <MoneyText value={String(r.interest)} prefix="LKR" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <MoneyText value={String(r.balance)} prefix="LKR" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <DebtDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        debt={editing}
        onSubmit={submitDebt}
        pending={addDebt.isPending || updateDebt.isPending}
      />
      <AlertDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete debt?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `“${deleting.name}” will be removed from your payoff plan. ` : ""}
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteDebt.mutate(deleting.id);
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
