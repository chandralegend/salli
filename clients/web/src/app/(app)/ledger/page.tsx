"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  Archive,
  BookOpen,
  CreditCard,
  Landmark,
  type LucideIcon,
  Pencil,
  PieChart,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  TrendingUp,
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
import { StatusChip, type ChipTone } from "@/components/shared/StatusChip";
import { EntityCard, CardSection } from "@/components/shared/EntityCard";
import { FilterChips } from "@/components/shared/FilterChips";
import { AccountDialog, type AccountType } from "@/components/ledger/AccountDialog";
import { EntryDialog, type EntryDraftInit } from "@/components/ledger/EntryDialog";
import { QuickAddDialog } from "@/components/ledger/QuickAddDialog";
import { ReverseConfirm } from "@/components/ledger/ReverseConfirm";
import { AccountDetailSheet } from "@/components/ledger/AccountDetailSheet";
import { EntryDetailSheet } from "@/components/ledger/EntryDetailSheet";
import { useLedger, type Account, type JournalEntry } from "@/hooks/useLedger";
import { useSalliStore } from "@/lib/store";
import { assessmentYearRange, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_TONES: Record<string, ChipTone> = {
  asset: "info",
  liability: "danger",
  equity: "neutral",
  income: "success",
  expense: "warning",
};

const SOURCE_TONES: Record<string, ChipTone> = {
  manual: "neutral",
  statement: "info",
  system: "neutral",
  sms: "neutral",
};

const ACCT_ORDER = ["asset", "liability", "equity", "income", "expense"] as const;
const ACCT_LABEL: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};
const ACCT_ICON: Record<string, LucideIcon> = {
  asset: Landmark,
  liability: CreditCard,
  equity: PieChart,
  income: TrendingUp,
  expense: ShoppingBag,
};

const ACCT_FILTERS = ["All", "Asset", "Liability", "Income", "Expense"] as const;
const ENTRY_FILTERS = ["All", "Income", "Expense", "Manual", "Statement"] as const;

/** "Today — 15 Jul 2026" / "Yesterday — …" / "12 Jul 2026" for a date group. */
function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const pretty = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const today = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (same(d, today)) return `Today — ${pretty}`;
  if (same(d, yesterday)) return `Yesterday — ${pretty}`;
  return pretty;
}

export default function LedgerPage() {
  const ledger = useLedger();
  const ay = assessmentYearRange();

  const [tab, setTab] = useState("accounts");
  const [search, setSearch] = useState("");
  const [acctFilter, setAcctFilter] = useState<(typeof ACCT_FILTERS)[number]>("All");
  const [entrySearch, setEntrySearch] = useState("");
  const [entryFilter, setEntryFilter] = useState<(typeof ENTRY_FILTERS)[number]>("All");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deactivating, setDeactivating] = useState<Account | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryDraft, setEntryDraft] = useState<EntryDraftInit | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [reversing, setReversing] = useState<JournalEntry | null>(null);
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);

  // Mobile-dock "+" (and dashboard new-entry) land here via the store signal.
  const quickAddRequest = useSalliStore((s) => s.quickAddEntryRequest);
  const quickAddConsumed = useSalliStore((s) => s.quickAddEntryConsumed);
  const consumeQuickAdd = useSalliStore((s) => s.consumeQuickAddEntry);
  useEffect(() => {
    if (quickAddRequest <= quickAddConsumed) return;
    const t = setTimeout(() => {
      consumeQuickAdd();
      setTab("entries");
      setEntryDialogOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [quickAddRequest, quickAddConsumed, consumeQuickAdd]);

  const accounts = useMemo(() => ledger.accounts.data ?? [], [ledger.accounts.data]);
  const entries = ledger.entries.data ?? [];
  const balances = ledger.trialBalance.data;
  const stmt = ledger.incomeStatement.data;

  const accountsById = useMemo(() => {
    const m: Record<string, Account> = {};
    for (const a of accounts) m[a.id] = a;
    return m;
  }, [accounts]);

  // Accounts filtered by search + type chip, then grouped by type.
  const groupedAccounts = useMemo(() => {
    const q = search.toLowerCase();
    const list = accounts.filter((a) => {
      if (acctFilter !== "All" && a.type !== acctFilter.toLowerCase()) return false;
      if (q && !`${a.code} ${a.name}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return ACCT_ORDER.map((type) => ({ type, items: list.filter((a) => a.type === type) })).filter(
      (g) => g.items.length > 0
    );
  }, [accounts, acctFilter, search]);

  // Entries filtered by search + type chip, then grouped by date (sorted).
  const groupedEntries = useMemo(() => {
    const q = entrySearch.toLowerCase();
    let list = entries;
    if (q) list = list.filter((e) => e.description.toLowerCase().includes(q));
    if (entryFilter === "Manual" || entryFilter === "Statement") {
      list = list.filter((e) => e.source === entryFilter.toLowerCase());
    } else if (entryFilter === "Income" || entryFilter === "Expense") {
      list = list.filter((e) =>
        e.postings.some((p) => accountsById[p.account_id]?.type === entryFilter.toLowerCase())
      );
    }
    const groups: Record<string, JournalEntry[]> = {};
    for (const e of list) (groups[e.entry_date] ??= []).push(e);
    const factor = sortDir === "desc" ? -1 : 1;
    return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1) * factor);
  }, [entries, entrySearch, entryFilter, sortDir, accountsById]);

  function submitAccount(data: { code: string; name: string; type: AccountType; currency: string }) {
    const close = () => {
      setAccountDialogOpen(false);
      setEditingAccount(null);
    };
    if (editingAccount) {
      ledger.updateAccount.mutate({ id: editingAccount.id, ...data }, { onSuccess: close });
    } else {
      ledger.addAccount.mutate(data, { onSuccess: close });
    }
  }

  function submitEntry(data: {
    entry_date: string;
    description: string;
    amount: string;
    debitId: string;
    creditId: string;
  }) {
    ledger.addEntry.mutate(
      {
        entry_date: data.entry_date,
        description: data.description,
        postings: [
          { account_id: data.debitId, direction: 1, amount: data.amount, currency: "LKR" },
          { account_id: data.creditId, direction: -1, amount: data.amount, currency: "LKR" },
        ],
      },
      { onSuccess: () => setEntryDialogOpen(false) }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ledger"
        subtitle={`Double-entry accounting · YA ${ay.label}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditingAccount(null);
                setAccountDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Account
            </Button>
            <Button variant="outline" onClick={() => setAiOpen(true)}>
              <Sparkles className="size-4" /> AI entry
            </Button>
            <Button
              onClick={() => {
                setEntryDraft(null);
                setEntryDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Entry
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
        </TabsList>

        {/* ── Chart of Accounts ── */}
        <TabsContent value="accounts" className="mt-4 space-y-3">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accounts…"
              className="pl-8"
            />
          </div>
          <FilterChips options={ACCT_FILTERS} value={acctFilter} onChange={setAcctFilter} />

          {ledger.accounts.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : groupedAccounts.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={BookOpen}
                title={search || acctFilter !== "All" ? "No matches" : "No accounts yet"}
                body={
                  search || acctFilter !== "All"
                    ? "Try a different name, code, or filter."
                    : "Add your first account, or redo profile setup to seed a starter chart."
                }
                action={
                  !search && acctFilter === "All" ? (
                    <Button size="sm" variant="outline" onClick={() => setAccountDialogOpen(true)}>
                      Add account
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {groupedAccounts.map((group) => {
                const Icon = ACCT_ICON[group.type] ?? Landmark;
                return (
                  <CardSection
                    key={group.type}
                    label={ACCT_LABEL[group.type]}
                    meta={`${group.items.length} account${group.items.length === 1 ? "" : "s"}`}
                  >
                    {group.items.map((a) => {
                      const isAsset = a.type === "asset";
                      const bal = balances?.[a.id];
                      return (
                        <EntityCard
                          key={a.id}
                          onClick={() => setDetailAccountId(a.id)}
                          dimmed={a.is_active === false}
                          accent={isAsset && a.is_active !== false ? "accent" : "muted"}
                          icon={Icon}
                          iconTone={isAsset ? "accent" : "muted"}
                          title={a.name}
                          titleChip={
                            <StatusChip tone={TYPE_TONES[a.type] ?? "neutral"}>
                              {a.type[0].toUpperCase() + a.type.slice(1)}
                            </StatusChip>
                          }
                          subtitle={`${a.code} · ${a.currency} · ${a.is_active === false ? "Inactive" : "Active"}`}
                          value={bal !== undefined ? `LKR ${formatMoney(bal, 0)}` : "—"}
                          valueMuted={!isAsset}
                          chevron
                          trailing={
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Edit account"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAccount(a);
                                  setAccountDialogOpen(true);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Deactivate account"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeactivating(a);
                                }}
                              >
                                <Archive className="size-3.5" />
                              </Button>
                            </div>
                          }
                        />
                      );
                    })}
                  </CardSection>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Journal Entries ── */}
        <TabsContent value="entries" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                placeholder="Search entries…"
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
            >
              <ArrowDownUp className="size-3.5" /> {sortDir === "desc" ? "Newest" : "Oldest"}
            </Button>
          </div>
          <FilterChips options={ENTRY_FILTERS} value={entryFilter} onChange={setEntryFilter} />

          {ledger.entries.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : groupedEntries.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={BookOpen}
                title={entrySearch || entryFilter !== "All" ? "No matching entries" : "Nothing posted yet"}
                body={
                  entrySearch || entryFilter !== "All"
                    ? "Try a different search or filter."
                    : "Add an entry, or upload a bank statement and post the parsed transactions."
                }
                action={
                  !entrySearch && entryFilter === "All" ? (
                    <Button size="sm" variant="outline" onClick={() => setEntryDialogOpen(true)}>
                      Add entry
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEntries.map(([date, dayEntries]) => (
                <CardSection key={date} label={dateGroupLabel(date)}>
                  {dayEntries.map((e) => {
                    const reversed = Boolean(e.reversed_by);
                    const debit = e.postings.find((p) => p.direction === 1);
                    const credit = e.postings.find((p) => p.direction === -1);
                    const debitAcc = debit ? accountsById[debit.account_id] : undefined;
                    const creditAcc = credit ? accountsById[credit.account_id] : undefined;
                    const isIncome = debitAcc?.type === "asset" && creditAcc?.type === "income";
                    const amount = debit?.amount ?? "0";
                    return (
                      <EntityCard
                        key={e.id}
                        onClick={() => setDetailEntry(e)}
                        dimmed={reversed}
                        accent={isIncome ? "accent" : "muted"}
                        title={<span className={cn(reversed && "line-through")}>{e.description}</span>}
                        titleChip={
                          reversed ? (
                            <StatusChip tone="neutral">reversed</StatusChip>
                          ) : (
                            <StatusChip tone={SOURCE_TONES[e.source] ?? "neutral"}>{e.source}</StatusChip>
                          )
                        }
                        subtitle={`DR: ${debitAcc?.name ?? "—"} · CR: ${creditAcc?.name ?? "—"}`}
                        value={`${isIncome ? "+" : "−"} LKR ${formatMoney(amount, 0)}`}
                        valueMuted={!isIncome}
                        trailing={
                          !reversed ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setReversing(e);
                              }}
                            >
                              <RotateCcw className="size-3.5" /> Reverse
                            </Button>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </CardSection>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Income Statement ── */}
        <TabsContent value="income" className="mt-4 space-y-4">
          {stmt && (
            <p className="text-[13px] text-muted-foreground">
              {stmt.from_date} – {stmt.to_date} · derived from posted entries
            </p>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {(["income", "expenses"] as const).map((side) => {
              const rows = Object.entries(stmt?.[side] ?? {});
              const total = rows.reduce((s, [, v]) => s + Number(v), 0);
              return (
                <div key={side} className="rounded-lg border bg-card p-5">
                  <h3 className="text-[15px] font-semibold capitalize mb-3">{side}</h3>
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">Nothing posted in this period.</p>
                  ) : (
                    <div className="divide-y">
                      {rows.map(([name, amount]) => (
                        <div key={name} className="flex justify-between py-2 text-sm">
                          <span>{name}</span>
                          <span className="money">{formatMoney(amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2.5 text-sm font-semibold">
                        <span>Total</span>
                        <span className="money">{formatMoney(String(total))}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rounded-lg bg-primary text-white px-5 py-4 flex items-center justify-between">
            <p className="eyebrow text-white/60">Net Income</p>
            <p className="money text-[24px] font-semibold text-[var(--status-success-text)]">
              LKR {formatMoney(stmt?.net_income)}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AccountDialog
        open={accountDialogOpen}
        onOpenChange={(v) => {
          setAccountDialogOpen(v);
          if (!v) setEditingAccount(null);
        }}
        account={editingAccount}
        onSubmit={submitAccount}
        pending={ledger.addAccount.isPending || ledger.updateAccount.isPending}
      />
      <EntryDialog
        open={entryDialogOpen}
        onOpenChange={(v) => {
          setEntryDialogOpen(v);
          if (!v) setEntryDraft(null);
        }}
        accounts={accounts}
        onSubmit={submitEntry}
        pending={ledger.addEntry.isPending}
        serverError={ledger.addEntry.error instanceof Error ? ledger.addEntry.error.message : null}
        initialDraft={entryDraft}
      />
      <QuickAddDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onDraft={(draft) => {
          setEntryDraft({
            description: draft.description,
            amount: draft.amount,
            debitId: draft.debit_account_id ?? "",
            creditId: draft.credit_account_id ?? "",
          });
          setTab("entries");
          setEntryDialogOpen(true);
        }}
      />
      <ReverseConfirm
        open={Boolean(reversing)}
        onOpenChange={(v) => !v && setReversing(null)}
        description={reversing?.description}
        onConfirm={() => {
          if (reversing) ledger.reverseEntry.mutate(reversing.id);
          setReversing(null);
        }}
      />
      <AlertDialog open={Boolean(deactivating)} onOpenChange={(v) => !v && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate account?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivating ? `“${deactivating.code} · ${deactivating.name}” — ` : ""}
              postings keep their history; the account is hidden from new entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deactivating) ledger.deactivateAccount.mutate(deactivating.id);
                setDeactivating(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail sheets (click-through from cards) */}
      <AccountDetailSheet
        accountId={detailAccountId}
        open={Boolean(detailAccountId)}
        onOpenChange={(v) => !v && setDetailAccountId(null)}
        onEdit={(a) => {
          setEditingAccount(a);
          setAccountDialogOpen(true);
        }}
        onDeactivate={(id) => ledger.deactivateAccount.mutate(id)}
        onReactivate={(id) => ledger.reactivateAccount.mutate(id)}
        actionPending={ledger.deactivateAccount.isPending || ledger.reactivateAccount.isPending}
      />
      <EntryDetailSheet
        entry={detailEntry}
        accounts={accounts}
        open={Boolean(detailEntry)}
        onOpenChange={(v) => !v && setDetailEntry(null)}
        onReverse={(id) => {
          ledger.reverseEntry.mutate(id);
          setDetailEntry(null);
        }}
      />
    </div>
  );
}
