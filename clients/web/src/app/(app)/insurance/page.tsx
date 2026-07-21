"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, Shield, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { StatusChip } from "@/components/shared/StatusChip";
import { MoneyText } from "@/components/shared/MoneyText";
import {
  PolicyDialog,
  type PolicyFormValues,
} from "@/components/insurance/PolicyDialog";
import { TargetDialog } from "@/components/insurance/TargetDialog";
import { useInsurance, type Policy, type Target as CoverageTarget } from "@/hooks/useInsurance";
import { formatMoney, formatDate } from "@/lib/format";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function InsurancePage() {
  const ins = useInsurance();

  const [tab, setTab] = useState("policies");
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [deletingTarget, setDeletingTarget] = useState<CoverageTarget | null>(null);

  const policies = useMemo(() => ins.policies.data ?? [], [ins.policies.data]);
  const activePolicies = useMemo(() => policies.filter((p) => p.is_active), [policies]);
  const targets = ins.targets.data ?? [];
  const report = ins.report.data;

  const totalCoverage = activePolicies.reduce((s, p) => s + Number(p.coverage_amount), 0);
  const totalTarget = targets.reduce((s, t) => s + Number(t.target_amount), 0);
  const totalGap = (report?.lines ?? []).reduce((s, l) => s + Math.max(0, Number(l.gap)), 0);
  const gapFree = totalTarget > 0 && totalGap <= 0;

  function submitPolicy(data: PolicyFormValues) {
    const close = () => {
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
    };
    if (editingPolicy) {
      ins.updatePolicy.mutate({ id: editingPolicy.id, body: data }, { onSuccess: close });
    } else {
      ins.addPolicy.mutate(data, { onSuccess: close });
    }
  }

  function submitTarget(data: { policy_type: string; target_amount: number }) {
    ins.setTarget.mutate(data, { onSuccess: () => setTargetDialogOpen(false) });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance"
        subtitle="Policies, coverage targets, and where you're exposed"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setTargetDialogOpen(true);
              }}
            >
              <Target className="size-4" /> Target
            </Button>
            <Button
              onClick={() => {
                setEditingPolicy(null);
                setPolicyDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Policy
            </Button>
          </>
        }
      />

      {/* Coverage hero */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          emphasis
          label="Total Coverage"
          value={`LKR ${formatMoney(String(totalCoverage), 0)}`}
          loading={ins.policies.isLoading}
          badge={
            <StatusChip tone={gapFree ? "success" : totalGap > 0 ? "danger" : "neutral"}>
              {totalTarget === 0
                ? "No targets set"
                : gapFree
                  ? "Fully covered"
                  : `LKR ${formatMoney(String(totalGap), 0)} gap`}
            </StatusChip>
          }
          caption={`${activePolicies.length} active ${activePolicies.length === 1 ? "policy" : "policies"}`}
        />
        <StatCard
          label="Target"
          value={`LKR ${formatMoney(String(totalTarget), 0)}`}
          loading={ins.targets.isLoading}
          caption={`${targets.length} ${targets.length === 1 ? "type" : "types"} declared`}
        />
        <StatCard
          label="Coverage Gap"
          value={<span className={totalGap > 0 ? "text-[var(--status-danger-text)]" : ""}>{`LKR ${formatMoney(String(totalGap), 0)}`}</span>}
          loading={ins.report.isLoading}
          caption={totalGap > 0 ? "Below your targets" : "You're on track"}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="report">Coverage Report</TabsTrigger>
        </TabsList>

        {/* ── Policies ── */}
        <TabsContent value="policies" className="mt-4">
          <div className="rounded-lg border bg-card">
            {ins.policies.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : activePolicies.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No policies yet"
                body="Add a policy to track its cover and premium, and measure it against your targets."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPolicy(null);
                      setPolicyDialogOpen(true);
                    }}
                  >
                    Add policy
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Coverage</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead className="w-28">Expires</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePolicies.map((p) => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <StatusChip tone="info">{cap(p.policy_type)}</StatusChip>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">{p.provider}</TableCell>
                      <TableCell className="text-right">
                        <MoneyText value={p.coverage_amount} prefix="LKR" decimals={0} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-[13px]">
                        <MoneyText value={p.premium_amount} decimals={0} />
                        <span className="ml-1 text-xs">/{p.premium_frequency}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(p.expiry_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit policy"
                            onClick={() => {
                              setEditingPolicy(p);
                              setPolicyDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete policy"
                            onClick={() => setDeletingPolicy(p)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Targets ── */}
        <TabsContent value="targets" className="mt-4">
          <div className="rounded-lg border bg-card">
            {ins.targets.isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-11" />
                ))}
              </div>
            ) : targets.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No coverage targets"
                body="Declare how much cover each policy type should carry — the coverage report measures your policies against these."
                action={
                  <Button size="sm" variant="outline" onClick={() => setTargetDialogOpen(true)}>
                    Set target
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy type</TableHead>
                    <TableHead className="text-right">Target amount</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((t) => (
                    <TableRow key={t.policy_type} className="group">
                      <TableCell className="font-medium">{cap(t.policy_type)}</TableCell>
                      <TableCell className="text-right">
                        <MoneyText value={t.target_amount} prefix="LKR" decimals={0} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete target"
                          className="opacity-40 group-hover:opacity-100 transition-opacity"
                          onClick={() => setDeletingTarget(t)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── Coverage Report ── */}
        <TabsContent value="report" className="mt-4 space-y-4">
          {ins.report.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <>
              {/* Per-type gap bars */}
              <div className="rounded-lg border bg-card">
                {report?.lines.length ? (
                  <div className="divide-y">
                    {report.lines.map((line) => {
                      const target = Number(line.target_amount);
                      const actual = Number(line.actual_coverage);
                      const gap = Number(line.gap);
                      const pct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
                      const covered = gap <= 0;
                      return (
                        <div key={line.policy_type} className="p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[15px] font-semibold">{cap(line.policy_type)}</span>
                            {covered ? (
                              <StatusChip tone="success">Covered</StatusChip>
                            ) : (
                              <StatusChip tone="danger">
                                Gap LKR {formatMoney(String(gap), 0)}
                              </StatusChip>
                            )}
                          </div>
                          <div className="mb-1.5 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${covered ? "bg-[var(--status-success-text)]" : "bg-[var(--status-danger-text)]"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            LKR {formatMoney(String(actual), 0)} of LKR{" "}
                            {formatMoney(String(target), 0)} target
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No coverage targets declared"
                    body="Set targets per policy type to see how your cover measures up."
                    action={
                      <Button size="sm" variant="outline" onClick={() => setTargetDialogOpen(true)}>
                        Set target
                      </Button>
                    }
                  />
                )}
              </div>

              {/* Missing coverage */}
              {(report?.missing_types.length ?? 0) > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--status-danger-text)]/25 bg-[var(--status-danger-bg)] p-4">
                  <AlertTriangle className="size-4 shrink-0 text-[var(--status-danger-text)] mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--status-danger-text)]">
                      Missing coverage
                    </p>
                    <p className="text-[13px] text-[var(--status-danger-text)]/90">
                      No active policy for: {report!.missing_types.map(cap).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Expiring soon */}
              {(report?.expiring_soon.length ?? 0) > 0 && (
                <div className="rounded-lg border bg-card">
                  <div className="border-b px-4 py-3">
                    <h3 className="text-[15px] font-semibold">Expiring soon</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Policy</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="w-28">Expires</TableHead>
                        <TableHead className="w-28 text-right">Days left</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report!.expiring_soon.map((e, i) => (
                        <TableRow key={`${e.policy_name}-${i}`}>
                          <TableCell className="font-medium">{e.policy_name}</TableCell>
                          <TableCell className="text-muted-foreground text-[13px]">
                            {cap(e.policy_type)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(e.expiry_date)}
                          </TableCell>
                          <TableCell className="text-right">
                            <StatusChip tone={e.days_until_expiry <= 30 ? "danger" : "warning"}>
                              {e.days_until_expiry} days
                            </StatusChip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {report &&
                report.lines.length > 0 &&
                report.missing_types.length === 0 &&
                report.expiring_soon.length === 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    No missing coverage and nothing expiring soon.
                  </p>
                )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PolicyDialog
        open={policyDialogOpen}
        onOpenChange={(v) => {
          setPolicyDialogOpen(v);
          if (!v) setEditingPolicy(null);
        }}
        policy={editingPolicy}
        onSubmit={submitPolicy}
        pending={ins.addPolicy.isPending || ins.updatePolicy.isPending}
      />
      <TargetDialog
        open={targetDialogOpen}
        onOpenChange={setTargetDialogOpen}
        onSubmit={submitTarget}
        pending={ins.setTarget.isPending}
      />

      {/* Delete policy confirm */}
      <AlertDialog open={Boolean(deletingPolicy)} onOpenChange={(v) => !v && setDeletingPolicy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPolicy ? `“${deletingPolicy.name}” — ` : ""}this removes it from your coverage
              totals. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingPolicy) ins.deletePolicy.mutate(deletingPolicy.id);
                setDeletingPolicy(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete target confirm */}
      <AlertDialog open={Boolean(deletingTarget)} onOpenChange={(v) => !v && setDeletingTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove target?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTarget ? `The ${deletingTarget.policy_type} target — ` : ""}the coverage
              report will stop measuring this type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingTarget) ins.deleteTarget.mutate(deletingTarget.policy_type);
                setDeletingTarget(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
