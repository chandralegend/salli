"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostingRow } from "@/components/PostingRow";
import { useLedger } from "@/hooks/useLedger";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"] as const;

const TYPE_COLORS: Record<string, string> = {
  asset: "bg-income/10 text-income border-income/30",
  liability: "bg-expense/10 text-expense border-expense/30",
  equity: "bg-warning/10 text-warning border-warning/30",
  income: "bg-income/10 text-income border-income/30",
  expense: "bg-expense/10 text-expense border-expense/30",
};

export default function LedgerPage() {
  const { accounts, entries, addAccount } = useLedger();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<typeof ACCOUNT_TYPES[number]>("asset");
  const [currency, setCurrency] = useState("LKR");

  async function handleAdd() {
    if (!code || !name) return;
    await addAccount.mutateAsync({ code, name, type, currency });
    setOpen(false);
    setCode("");
    setName("");
  }

  return (
    <div className="p-6 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chart of accounts &amp; journal entries
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Account
        </Button>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-card">
            Chart of Accounts
          </TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-card">
            Journal Entries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <div className="rounded-[16px] bg-card border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                    Code
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                    Name
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                    Type
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                    Currency
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex gap-2 justify-center">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="h-4 w-24 bg-secondary rounded animate-pulse"
                          />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (accounts.data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground text-sm"
                    >
                      No accounts yet. Add your first account.
                    </TableCell>
                  </TableRow>
                ) : (
                  (accounts.data ?? []).map((account) => (
                    <TableRow
                      key={account.id}
                      className="border-border hover:bg-secondary/40"
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {account.code}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {account.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono capitalize ${TYPE_COLORS[account.type] ?? ""}`}
                        >
                          {account.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {account.currency}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="entries">
          <div className="rounded-[16px] bg-card border border-border p-6">
            {entries.isLoading ? (
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-secondary rounded animate-pulse" />
                ))}
              </div>
            ) : (entries.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No journal entries. Upload a bank statement or add entries manually.
              </p>
            ) : (
              (entries.data ?? []).map((entry) => {
                const first = entry.postings[0];
                if (!first) return null;
                return (
                  <PostingRow
                    key={entry.id}
                    date={entry.entry_date}
                    description={entry.description}
                    amount={first.amount}
                    isCredit={first.direction === -1}
                    currency={first.currency}
                  />
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <Label className="text-muted-foreground text-xs mb-1.5">
                Account Code
              </Label>
              <Input
                placeholder="e.g. 1100"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-secondary border-border font-mono"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-1.5">
                Name
              </Label>
              <Input
                placeholder="e.g. Cash at Bank"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-1.5">
                Type
              </Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setType(v as typeof ACCOUNT_TYPES[number])
                }
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs mb-1.5">
                Currency
              </Label>
              <Input
                placeholder="LKR"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-secondary border-border font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={addAccount.isPending || !code || !name}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
