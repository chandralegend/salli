"use client";

import { useMemo, useState } from "react";
import { Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { BudgetView } from "@/components/budget/BudgetView";
import { BudgetEditor } from "@/components/budget/BudgetEditor";
import { useBudget, monthRange } from "@/hooks/useBudget";
import { useLedger } from "@/hooks/useLedger";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function currentMonthLabel() {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function BudgetPage() {
  const { budgets, latest, summary, monthlyIncome, createBudget, updateBudget } = useBudget();
  const ledger = useLedger();
  const [editing, setEditing] = useState(false);

  const accounts = useMemo(() => ledger.accounts.data ?? [], [ledger.accounts.data]);
  const monthLabel = currentMonthLabel();

  // Seed editor inputs from the existing budget's lines when editing.
  const initialLimits = useMemo(() => {
    const pre: Record<string, string> = {};
    (latest?.lines ?? []).forEach((l) => {
      pre[l.account_id] = String(Math.round(Number(l.limit_amount)));
    });
    return pre;
  }, [latest]);

  const saving = createBudget.isPending || updateBudget.isPending;

  function handleSave(lines: { account_id: string; limit_amount: number }[]) {
    const { from, to } = monthRange();
    const onSuccess = () => setEditing(false);
    if (latest) {
      updateBudget.mutate({ id: latest.id, period_start: from, period_end: to, lines }, { onSuccess });
    } else {
      createBudget.mutate({ period_start: from, period_end: to, lines }, { onSuccess });
    }
  }

  const hasBudget = Boolean(latest);
  const loading = budgets.isLoading || (hasBudget && summary.isLoading);

  return (
    <div className="space-y-6">
      <PageHeader
        title={editing ? "Budget setup" : "Budget"}
        subtitle={`Spend vs. limit · ${monthLabel}`}
        actions={
          hasBudget && !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit limits
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : editing ? (
        <BudgetEditor
          accounts={accounts}
          initialLimits={initialLimits}
          monthlyIncome={monthlyIncome}
          saving={saving}
          isUpdate={hasBudget}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : hasBudget && summary.data ? (
        <BudgetView summary={summary.data} monthLabel={monthLabel} />
      ) : (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={Wallet}
            title="No budget yet"
            body="Set monthly limits per spending category and track actuals against them from your ledger."
            action={
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Set up budget
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
