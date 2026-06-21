"use client";

import { useState, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLedger, type Account } from "@/hooks/useLedger";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;
type AccountType = typeof ACCOUNT_TYPES[number];

const TYPE_COLORS: Record<string, string> = {
  asset:     "bg-sky-50 text-sky-700 border-sky-200",
  liability: "bg-rose-50 text-rose-700 border-rose-200",
  equity:    "bg-violet-50 text-violet-700 border-violet-200",
  income:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  expense:   "bg-amber-50 text-amber-700 border-amber-200",
};

type JournalEntry = {
  id: string;
  entry_date: string;
  description: string;
  source: string;
  reversed_by?: string | null;
  postings: Array<{ direction: number; amount: string | number; currency: string }>;
};

function fmt(v: string | number) {
  return Number(v).toLocaleString("en-LK", { minimumFractionDigits: 2 });
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium capitalize ${TYPE_COLORS[type] ?? "bg-muted text-muted-foreground"}`}>
      {type}
    </span>
  );
}

export default function LedgerPage() {
  const { accounts, entries, incomeStatement, addAccount, updateAccount, deactivateAccount, addEntry, reverseEntry } = useLedger();

  // Add Account
  const [acctOpen, setAcctOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("asset");
  const [currency, setCurrency] = useState("LKR");

  // Edit Account
  const [editAcct, setEditAcct] = useState<Account | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("asset");
  const [editCurrency, setEditCurrency] = useState("LKR");

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<Account | null>(null);

  // Add Entry
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryDesc, setEntryDesc] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");

  // Reverse confirm
  const [reverseTarget, setReverseTarget] = useState<string | null>(null);

  const accountsList = accounts.data ?? [];

  function openEdit(a: Account) {
    setEditAcct(a);
    setEditCode(a.code);
    setEditName(a.name);
    setEditType(a.type as AccountType);
    setEditCurrency(a.currency);
  }

  async function handleAddAccount() {
    if (!code || !name) return;
    await addAccount.mutateAsync({ code, name, type, currency });
    setAcctOpen(false);
    setCode(""); setName(""); setType("asset"); setCurrency("LKR");
  }

  async function handleUpdateAccount() {
    if (!editAcct || !editCode || !editName) return;
    await updateAccount.mutateAsync({ id: editAcct.id, code: editCode, name: editName, type: editType, currency: editCurrency });
    setEditAcct(null);
  }

  async function handleAddEntry() {
    if (!entryDate || !entryDesc || !debitAccountId || !creditAccountId || !amount) return;
    await addEntry.mutateAsync({
      entry_date: entryDate,
      description: entryDesc,
      postings: [
        { account_id: debitAccountId, direction: 1, amount, currency: "LKR" },
        { account_id: creditAccountId, direction: -1, amount, currency: "LKR" },
      ],
    });
    setEntryOpen(false);
    setEntryDesc(""); setDebitAccountId(""); setCreditAccountId(""); setAmount("");
  }

  /* ── Column definitions ── */

  const accountColumns = useMemo<ColumnDef<Account>[]>(() => [
    {
      accessorKey: "code",
      size: 90,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => (
        <span className="font-mono text-[12px] text-muted-foreground tabular-nums">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="text-[13px] font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "type",
      size: 110,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => <TypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "currency",
      size: 90,
      enableSorting: false,
      header: () => <span className="text-secondary-label">Currency</span>,
      cell: ({ row }) => (
        <span className="text-[12px] text-muted-foreground font-mono">{row.original.currency}</span>
      ),
    },
    {
      accessorKey: "is_active",
      size: 90,
      enableSorting: false,
      header: () => <span className="text-secondary-label">Status</span>,
      cell: ({ row }) => (
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${row.original.is_active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
          {row.original.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      size: 80,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => openEdit(row.original)}
            title="Edit account"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {row.original.is_active && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => setDeactivateTarget(row.original)}
              title="Deactivate"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const entryColumns = useMemo<ColumnDef<JournalEntry>[]>(() => [
    {
      accessorKey: "entry_date",
      size: 100,
      sortingFn: "datetime",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => (
        <span className="text-[12px] font-mono text-muted-foreground tabular-nums">{row.original.entry_date}</span>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
      cell: ({ row }) => {
        const reversed = !!row.original.reversed_by;
        return (
          <div>
            <p className={`text-[13px] font-medium ${reversed ? "line-through text-muted-foreground" : ""}`}>
              {row.original.description}
            </p>
            {reversed && <p className="text-[11px] text-muted-foreground">Reversed</p>}
          </div>
        );
      },
    },
    {
      accessorKey: "source",
      size: 100,
      enableSorting: false,
      header: () => <span className="text-secondary-label">Source</span>,
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium capitalize">
          {row.original.source}
        </span>
      ),
    },
    {
      id: "amount",
      size: 130,
      enableSorting: false,
      header: () => <span className="text-secondary-label block text-right">Amount</span>,
      cell: ({ row }) => {
        const dr = row.original.postings.find((p) => p.direction === 1);
        return (
          <span className="text-[13px] font-medium tabular-nums block text-right">
            {dr ? `${dr.currency} ${fmt(dr.amount)}` : "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      size: 60,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) =>
        !row.original.reversed_by ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-amber-600"
              onClick={() => setReverseTarget(row.original.id)}
              title="Create reversing entry"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : null,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const entriesList = (entries.data ?? []) as JournalEntry[];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Ledger</h1>
          <p className="text-meta mt-0.5">Chart of accounts, journal entries &amp; income statement</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEntryOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Entry
          </Button>
          <Button size="sm" onClick={() => setAcctOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Account
          </Button>
        </div>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="mb-4">
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="income">Income Statement</TabsTrigger>
        </TabsList>

        {/* ── Accounts ── */}
        <TabsContent value="accounts">
          <Card className="overflow-hidden">
            <DataTable
              columns={accountColumns}
              data={accountsList}
              isLoading={accounts.isLoading}
              searchPlaceholder="Search accounts…"
              emptyNode={
                <span className="text-[13px] text-muted-foreground">
                  No accounts yet.{" "}
                  <button onClick={() => setAcctOpen(true)} className="underline text-primary hover:text-primary/80">
                    Add your first account
                  </button>
                </span>
              }
            />
          </Card>
        </TabsContent>

        {/* ── Journal Entries ── */}
        <TabsContent value="entries">
          <Card className="overflow-hidden">
            <DataTable
              columns={entryColumns}
              data={entriesList}
              isLoading={entries.isLoading}
              searchPlaceholder="Search entries…"
              getRowClassName={(row) =>
                (row.original as JournalEntry).reversed_by ? "opacity-50" : ""
              }
              emptyNode={
                <span className="text-[13px] text-muted-foreground">
                  No journal entries yet.{" "}
                  <button onClick={() => setEntryOpen(true)} className="underline text-primary hover:text-primary/80">
                    Post the first entry
                  </button>
                </span>
              }
            />
          </Card>
        </TabsContent>

        {/* ── Income Statement ── */}
        <TabsContent value="income">
          {incomeStatement.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 h-11" />
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex justify-between px-4 py-2.5 border-b">
                      <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                      <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    </div>
                  ))}
                </Card>
              ))}
            </div>
          ) : !incomeStatement.data ? (
            <Card className="p-12 text-center">
              <p className="text-[13px] text-muted-foreground">No income statement data available.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Income */}
                <Card className="overflow-hidden">
                  <div className="px-4 py-2.5 border-b bg-emerald-50/60">
                    <p className="text-[12px] font-semibold text-emerald-800 uppercase tracking-wider">Income</p>
                  </div>
                  <Table>
                    <TableBody>
                      {Object.entries(incomeStatement.data.income ?? {}).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-6 text-[13px]">No income recorded</TableCell>
                        </TableRow>
                      ) : (
                        Object.entries(incomeStatement.data.income ?? {}).map(([k, v]) => (
                          <TableRow key={k} className="border-b last:border-0">
                            <TableCell className="text-[13px] px-4 py-2.5">{k}</TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-700 font-medium text-[13px] px-4 py-2.5">
                              LKR {fmt(v as string | number)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>

                {/* Expenses */}
                <Card className="overflow-hidden">
                  <div className="px-4 py-2.5 border-b bg-rose-50/60">
                    <p className="text-[12px] font-semibold text-rose-800 uppercase tracking-wider">Expenses</p>
                  </div>
                  <Table>
                    <TableBody>
                      {Object.entries(incomeStatement.data.expenses ?? {}).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-6 text-[13px]">No expenses recorded</TableCell>
                        </TableRow>
                      ) : (
                        Object.entries(incomeStatement.data.expenses ?? {}).map(([k, v]) => (
                          <TableRow key={k} className="border-b last:border-0">
                            <TableCell className="text-[13px] px-4 py-2.5">{k}</TableCell>
                            <TableCell className="text-right tabular-nums text-rose-700 font-medium text-[13px] px-4 py-2.5">
                              LKR {fmt(v as string | number)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Net Income summary bar */}
              <Card className="overflow-hidden">
                <div className="px-4 py-3.5 flex items-center justify-between">
                  <p className="text-[13px] font-semibold">Net Income</p>
                  <p className={`text-[18px] font-bold tabular-nums tracking-tight ${Number(incomeStatement.data.net_income) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    LKR {fmt(incomeStatement.data.net_income)}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add Account Dialog ── */}
      <Dialog open={acctOpen} onOpenChange={setAcctOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>Create a new account in your chart of accounts.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. 1100" value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Input placeholder="LKR" value={currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Cash at Bank" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType((v ?? "asset") as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcctOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAccount} disabled={addAccount.isPending || !code || !name}>
              {addAccount.isPending ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Account Dialog ── */}
      <Dialog open={!!editAcct} onOpenChange={(open) => { if (!open) setEditAcct(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>Update account details.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Currency</Label>
                <Input value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType((v ?? editType) as AccountType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAcct(null)}>Cancel</Button>
            <Button onClick={handleUpdateAccount} disabled={updateAccount.isPending || !editCode || !editName}>
              {updateAccount.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirm ── */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate account?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deactivateTarget?.name}</strong> will be hidden from the chart of accounts.
              Existing journal entries are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deactivateTarget) {
                  await deactivateAccount.mutateAsync(deactivateTarget.id);
                  setDeactivateTarget(null);
                }
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add Journal Entry Dialog ── */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>Record a double-entry transaction manually.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Amount (LKR) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Office supplies" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Debit Account <span className="text-destructive">*</span></Label>
                <Select value={debitAccountId} onValueChange={(v) => setDebitAccountId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accountsList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Credit Account <span className="text-destructive">*</span></Label>
                <Select value={creditAccountId} onValueChange={(v) => setCreditAccountId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accountsList.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Debit and credit use the same amount to keep the entry balanced.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddEntry}
              disabled={addEntry.isPending || !entryDate || !entryDesc || !debitAccountId || !creditAccountId || !amount}
            >
              {addEntry.isPending ? "Posting…" : "Post Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reverse Entry Confirm ── */}
      <AlertDialog open={!!reverseTarget} onOpenChange={(open) => { if (!open) setReverseTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create reversing entry?</AlertDialogTitle>
            <AlertDialogDescription>
              A new journal entry with all debits and credits swapped will be posted.
              Journal entries are immutable — this is the standard correction method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (reverseTarget) {
                  await reverseEntry.mutateAsync(reverseTarget);
                  setReverseTarget(null);
                }
              }}
            >
              Post Reversal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
