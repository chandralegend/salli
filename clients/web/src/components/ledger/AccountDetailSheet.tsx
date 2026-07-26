"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Power, PowerOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { StatusChip, type ChipTone } from "@/components/shared/StatusChip";
import { MoneyText } from "@/components/shared/MoneyText";
import { useAccountOverview, type Account, type AccountTransaction } from "@/hooks/useLedger";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

const TYPE_TONES: Record<string, ChipTone> = {
  asset: "info",
  liability: "danger",
  equity: "neutral",
  income: "success",
  expense: "warning",
};

const PERIODS = ["1M", "3M", "YTD", "1Y", "All"] as const;
type Period = (typeof PERIODS)[number];

function periodStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "1M":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3M":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "YTD":
      return new Date(now.getFullYear(), 0, 1);
    case "1Y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return null;
  }
}

/**
 * Account Detail — navy balance hero (money in / out for the selected period)
 * over the account's recent entries. Mirrors mobile's AccountDetailModal,
 * backed by GET /accounts/{id}/overview. Edit + Deactivate/Reactivate actions.
 */
export function AccountDetailSheet({
  accountId,
  open,
  onOpenChange,
  onEdit,
  onDeactivate,
  onReactivate,
  actionPending = false,
}: {
  accountId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Opens the existing AccountDialog for this account. */
  onEdit: (account: Account) => void;
  onDeactivate: (accountId: string) => void;
  onReactivate: (accountId: string) => void;
  actionPending?: boolean;
}) {
  const overview = useAccountOverview(open ? accountId : null);
  const [period, setPeriod] = useState<Period>("3M");
  const [confirmToggle, setConfirmToggle] = useState(false);

  const account = overview.data?.account;

  // Chronological deltas from running balances → per-entry signed amount.
  const withDelta = useMemo(() => {
    const txs = overview.data?.transactions ?? [];
    let prev = 0;
    return txs.map((t) => {
      const bal = Number(t.running_balance);
      const delta = bal - prev;
      prev = bal;
      return { ...t, delta };
    });
  }, [overview.data]);

  const start = periodStart(period);
  const visibleTxs = useMemo(
    () => withDelta.filter((t) => !start || new Date(t.entry_date) >= start),
    [withDelta, start]
  );

  const moneyIn = visibleTxs.reduce((s, t) => s + Math.max(0, t.delta), 0);
  const moneyOut = visibleTxs.reduce((s, t) => s + Math.max(0, -t.delta), 0);
  const rows: (AccountTransaction & { delta: number })[] = [...visibleTxs].reverse();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Account detail</SheetTitle>
            <SheetDescription>Balance and recent activity from posted entries.</SheetDescription>
          </SheetHeader>

          {overview.isLoading || !account ? (
            <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
              {overview.isError ? "Couldn’t load this account." : "Loading…"}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* balance hero */}
              <div className="rounded-lg bg-[var(--emphasis)] text-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <StatusChip tone={TYPE_TONES[account.type] ?? "neutral"}>
                        {account.type[0].toUpperCase() + account.type.slice(1)}
                      </StatusChip>
                      <span className="text-[11px] text-white/40">
                        {account.code} · {account.currency}
                      </span>
                    </div>
                    <p className="mb-2 font-heading text-[15px] font-medium truncate">{account.name}</p>
                    <p className="money text-[34px] leading-none font-semibold">
                      <span className="text-white/40 text-[18px] mr-1">LKR</span>
                      {overviewBalance(overview.data!.current_balance)}
                    </p>
                    <p className="mt-1.5 text-[11px] text-white/40">
                      Current balance · {account.is_active !== false ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit account"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => onEdit(account)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-white/[0.06] px-3 py-2.5">
                    <p className="mb-0.5 text-[10px] text-white/40">Money in ({period})</p>
                    <MoneyText value={String(moneyIn)} decimals={0} className="text-[14px] font-semibold text-white" />
                  </div>
                  <div className="rounded-md bg-white/[0.06] px-3 py-2.5">
                    <p className="mb-0.5 text-[10px] text-white/40">Money out ({period})</p>
                    <MoneyText value={String(moneyOut)} decimals={0} className="text-[14px] font-semibold text-white/60" />
                  </div>
                </div>
              </div>

              {/* period select */}
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow">Entries · {visibleTxs.length}</p>
                <Select value={period} onValueChange={(v) => setPeriod((v as Period) ?? "3M")}>
                  <SelectTrigger size="sm" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* recent entries */}
              {rows.length === 0 ? (
                <div className="rounded-lg border bg-card p-6 text-center text-[13px] text-muted-foreground">
                  No entries in this period.
                </div>
              ) : (
                <div className="rounded-lg border bg-card divide-y">
                  {rows.map((t) => {
                    const inflow = t.delta >= 0;
                    return (
                      <div key={t.entry_id} className="flex items-center gap-3 p-3">
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-md",
                            inflow ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {inflow ? (
                            <ArrowDownLeft className="size-4" />
                          ) : (
                            <ArrowUpRight className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">{t.description}</p>
                          <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                            {formatDate(t.entry_date)} · {t.source}
                          </p>
                        </div>
                        <MoneyText
                          value={String(t.delta)}
                          decimals={0}
                          prefix="LKR"
                          className={cn("text-[13px] font-semibold", inflow ? "text-foreground" : "text-muted-foreground")}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* activation control */}
              {account.is_active !== false ? (
                <Button
                  variant="outline"
                  className="w-full text-[var(--status-danger-text)] border-[var(--status-danger-text)]/25 hover:bg-[var(--status-danger-bg)]"
                  disabled={actionPending}
                  onClick={() => setConfirmToggle(true)}
                >
                  <PowerOff className="size-4" /> Deactivate account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full text-primary border-primary/30 hover:bg-primary/10"
                  disabled={actionPending}
                  onClick={() => setConfirmToggle(true)}
                >
                  <Power className="size-4" /> Reactivate account
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmToggle} onOpenChange={setConfirmToggle}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {account?.is_active !== false ? "Deactivate account?" : "Reactivate account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {account ? <span className="block font-medium text-foreground mb-1">“{account.code} · {account.name}”</span> : null}
              {account?.is_active !== false
                ? "Postings keep their history; the account is hidden from new entries."
                : "The account becomes selectable for new entries again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={account?.is_active !== false ? "destructive" : "default"}
              onClick={() => {
                if (account) {
                  if (account.is_active !== false) onDeactivate(account.id);
                  else onReactivate(account.id);
                }
                setConfirmToggle(false);
              }}
            >
              {account?.is_active !== false ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Balance hero renders LKR separately, so strip the prefix from formatMoney. */
function overviewBalance(value: string): string {
  // formatMoney with 0 decimals for a compact hero figure.
  const n = Number(value);
  if (!isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}
