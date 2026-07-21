"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, RotateCcw, Search, Archive } from "lucide-react";
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
import { StatusChip, type ChipTone } from "@/components/shared/StatusChip";
import { MoneyText } from "@/components/shared/MoneyText";
import { AccountDialog, type AccountType } from "@/components/ledger/AccountDialog";
import { EntryDialog } from "@/components/ledger/EntryDialog";
import { ReverseConfirm } from "@/components/ledger/ReverseConfirm";
import { useLedger, type Account, type JournalEntry } from "@/hooks/useLedger";
import { useSalliStore } from "@/lib/store";
import { assessmentYearRange, formatMoney } from "@/lib/format";

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

export default function LedgerPage() {
  const ledger = useLedger();
  const ay = assessmentYearRange();

  const [tab, setTab] = useState("accounts");
  const [search, setSearch] = useState("");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deactivating, setDeactivating] = useState<Account | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [reversing, setReversing] = useState<JournalEntry | null>(null);

  // Mobile-dock "+" (and dashboard new-entry) land here via the store signal.
  const quickAddRequest = useSalliStore((s) => s.quickAddEntryRequest);
  const quickAddConsumed = useSalliStore((s) => s.quickAddEntryConsumed);
  const consumeQuickAdd = useSalliStore((s) => s.consumeQuickAddEntry);
  useEffect(() => {
    if (quickAddRequest <= quickAddConsumed) return;
    // Deferred: state updates happen in the timeout callback, not the effect body.
    const t = setTimeout(() => {
      consumeQuickAdd();
      setTab("entries");
      setEntryDialogOpen(true);
    }, 0);
    return () => clearTimeout(t);
  }, [quickAddRequest, quickAddConsumed, consumeQuickAdd]);

  const accounts = useMemo(() => ledger.accounts.data ?? [], [ledger.accounts.data]);
  const entries = ledger.entries.data ?? [];
  const stmt = ledger.incomeStatement.data;

  const filteredAccounts = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? accounts.filter((a) => a.name.toLowerCase().includes(q) || a.code.includes(q))
      : accounts;
  }, [accounts, search]);

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
            <Button onClick={() => setEntryDialogOpen(true)}>
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
        <TabsContent value="accounts" className="mt-4">
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search accounts…"
                  className="pl-8"
                />
              </div>
            </div>
            {ledger.accounts.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : filteredAccounts.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={search ? "No matches" : "No accounts yet"}
                body={
                  search
                    ? "Try a different name or code."
                    : "Add your first account, or redo profile setup to seed a starter chart."
                }
                action={
                  !search ? (
                    <Button size="sm" variant="outline" onClick={() => setAccountDialogOpen(true)}>
                      Add account
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((a) => (
                    <TableRow key={a.id} className="group">
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <StatusChip tone={TYPE_TONES[a.type] ?? "neutral"}>
                          {a.type[0].toUpperCase() + a.type.slice(1)}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[13px]">{a.currency}</TableCell>
                      <TableCell>
                        {a.is_active !== false ? (
                          <StatusChip tone="success">Active</StatusChip>
                        ) : (
                          <StatusChip tone="neutral">Inactive</StatusChip>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit account"
                            onClick={() => {
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
                            onClick={() => setDeactivating(a)}
                          >
                            <Archive className="size-3.5" />
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

        {/* ── Journal Entries ── */}
        <TabsContent value="entries" className="mt-4">
          <div className="rounded-lg border bg-card">
            {ledger.entries.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nothing posted yet"
                body="Add an entry, or upload a bank statement and post the parsed transactions."
                action={
                  <Button size="sm" variant="outline" onClick={() => setEntryDialogOpen(true)}>
                    Add entry
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-28 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const reversed = Boolean(e.reversed_by);
                    const amount = e.postings.find((p) => p.direction === 1)?.amount ?? "0";
                    return (
                      <TableRow key={e.id} className="group">
                        <TableCell className="font-mono text-xs text-muted-foreground">{e.entry_date}</TableCell>
                        <TableCell className={reversed ? "line-through text-muted-foreground" : "font-medium"}>
                          {e.description}
                          {reversed && (
                            <StatusChip tone="neutral" className="ml-2 no-underline">
                              reversed
                            </StatusChip>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={SOURCE_TONES[e.source] ?? "neutral"}>{e.source}</StatusChip>
                        </TableCell>
                        <TableCell className="text-right">
                          <MoneyText value={amount} prefix="LKR" />
                        </TableCell>
                        <TableCell className="text-right">
                          {!reversed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-40 group-hover:opacity-100 transition-opacity"
                              onClick={() => setReversing(e)}
                            >
                              <RotateCcw className="size-3.5" /> Reverse
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
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
                          <MoneyText value={amount} />
                        </div>
                      ))}
                      <div className="flex justify-between py-2.5 text-sm font-semibold">
                        <span>Total</span>
                        <MoneyText value={String(total)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="rounded-lg bg-[#0A2540] text-white px-5 py-4 flex items-center justify-between">
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
        onOpenChange={setEntryDialogOpen}
        accounts={accounts}
        onSubmit={submitEntry}
        pending={ledger.addEntry.isPending}
        serverError={ledger.addEntry.error instanceof Error ? ledger.addEntry.error.message : null}
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
    </div>
  );
}
