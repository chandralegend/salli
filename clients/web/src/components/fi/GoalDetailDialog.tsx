"use client";

import { useState } from "react";
import { Check, Loader2, TriangleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteGoal,
  useGoalAllocations,
  useSetGoalAllocation,
  useUpdateGoal,
  type Goal,
} from "@/hooks/useFi";
import { useLedger } from "@/hooks/useLedger";
import { formatMoney } from "@/lib/format";

const PRIORITIES = [
  { value: 1, label: "High" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Low" },
] as const;

/**
 * Edit a goal, and earmark the accounts behind it.
 *
 * Two gaps closed here. `PATCH /fi/goals/{id}` has existed all along and
 * `useUpdateGoal` was defined but never rendered, so changing a goal meant
 * deleting and recreating it. And goal progress was a number nobody could
 * enter — it now comes from earmarking real accounts, so it moves when money
 * moves.
 *
 * Only asset accounts are offered: a goal is backed by money you hold, and
 * earmarking an expense or income account would be meaningless.
 */
export function GoalDetailDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { accounts, trialBalance } = useLedger();
  const allocations = useGoalAllocations(open && goal ? goal.id : null);
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const setAllocation = useSetGoalAllocation();

  // Seeded straight from props rather than in an effect. The caller keys this
  // component on the goal id, so opening a different goal remounts it and the
  // form re-initialises naturally — no cascading render, and no chance of
  // showing the previous goal's values for a frame.
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(Number(goal.target_amount)) : "");
  const [priority, setPriority] = useState(goal?.priority ?? 2);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!goal) return null;

  const assetAccounts = (accounts.data ?? []).filter((a) => a.type === "asset" && a.is_active);
  const allocated = new Map(
    (allocations.data ?? []).map((a) => [a.account_id, a.allocated_amount]),
  );
  const hasShortfall = Number(goal.shortfall) > 0;

  async function saveDetails() {
    const amount = Number(target);
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Give the goal a name and a target above zero.");
      return;
    }
    try {
      await updateGoal.mutateAsync({
        id: goal!.id,
        body: { name: name.trim(), target_amount: amount, priority },
      });
      toast.success("Goal updated.");
    } catch {
      toast.error("Could not save that. Please try again.");
    }
  }

  async function commitAllocation(accountId: string) {
    const raw = drafts[accountId];
    if (raw === undefined) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter an amount of zero or more.");
      return;
    }
    try {
      await setAllocation.mutateAsync({
        goalId: goal!.id,
        account_id: accountId,
        allocated_amount: amount,
      });
      setDrafts((d) => {
        const next = { ...d };
        delete next[accountId];
        return next;
      });
    } catch {
      toast.error("Could not update that earmark.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal.name}</DialogTitle>
          <DialogDescription>
            Progress comes from the live balance of the accounts you earmark, so it moves only when
            your money does.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-4">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Funded</span>
              <span className="money text-[15px] font-semibold">
                LKR {formatMoney(goal.current_amount, 0)}
                <span className="text-[13px] font-normal text-muted-foreground">
                  {" "}
                  of {formatMoney(goal.target_amount, 0)}
                </span>
              </span>
            </div>
            {hasShortfall && (
              <p className="mt-2.5 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-700">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                <span>
                  You&rsquo;ve earmarked LKR {formatMoney(goal.allocated_amount, 0)} but those
                  accounts hold LKR {formatMoney(goal.shortfall, 0)} less than that right now.
                </span>
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Goal name</Label>
              <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input
                id="goal-target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex rounded-full bg-muted p-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 rounded-full py-1.5 text-[13px] transition-colors ${
                    priority === p.value
                      ? "bg-foreground font-semibold text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground">
              When one account is earmarked for several goals and can&rsquo;t cover them all, the
              higher priority stays funded.
            </p>
          </div>

          <Button onClick={saveDetails} disabled={updateGoal.isPending} className="w-full">
            {updateGoal.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
          </Button>

          <div className="space-y-2">
            <Label>Money behind this goal</Label>
            {accounts.isLoading || allocations.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : assetAccounts.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                No accounts yet — add one in the Ledger first.
              </p>
            ) : (
              assetAccounts.map((a) => {
                const current = allocated.get(a.id) ?? "0";
                const draft = drafts[a.id];
                const value = draft ?? (Number(current) > 0 ? String(Number(current)) : "");
                const balance = trialBalance.data?.[a.id] ?? "0";
                const dirty = draft !== undefined && Number(draft || 0) !== Number(current);
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">{a.name}</p>
                      <p className="money mt-0.5 text-[12px] text-muted-foreground">
                        Holds LKR {formatMoney(balance, 0)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        value={value}
                        placeholder="0"
                        onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && commitAllocation(a.id)}
                        className="money w-32 text-right"
                      />
                      <Button
                        size="icon"
                        onClick={() => commitAllocation(a.id)}
                        disabled={!dirty || setAllocation.isPending}
                        className={dirty ? "" : "invisible"}
                        aria-label={`Save earmark for ${a.name}`}
                      >
                        {setAllocation.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            <p className="text-[12px] text-muted-foreground">
              Earmarking doesn&rsquo;t move any money — it just records which part of an account is
              meant for this goal. One account can back several goals.
            </p>
          </div>

          <Button
            variant="ghost"
            onClick={async () => {
              await deleteGoal.mutateAsync(goal!.id);
              onOpenChange(false);
            }}
            disabled={deleteGoal.isPending}
            className="w-full text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" /> Delete this goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
