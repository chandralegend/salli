import { useRouter } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  CreditCard,
  Landmark,
  type LucideIcon,
  PieChart,
  Plus,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import { AddEditAccountDrawer } from "@/components/AddEditAccountDrawer";
import { EntryDetailSheet } from "@/components/EntryDetailSheet";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { PostingChip } from "@/components/ui/posting-chip";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageShell } from "@/components/ui/page-shell";
import { Tabs } from "@/components/ui/tabs";
import { useThemedRefreshControl } from "@/components/ui/themed-refresh-control";
import { TourTarget } from "@/components/tour/TourTarget";
import type { Account, JournalEntry } from "@/hooks/useDashboard";
import {
  useAccounts,
  useEntries,
  useIncomeStatement,
  useLedgerMutations,
  useTrialBalance,
} from "@/hooks/useLedger";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useHardShadow, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const TABS = ["Accounts", "Journal", "Income Stmt"] as const;
const TYPE_FILTERS = ["All", "Income", "Expense", "Manual", "Statement"] as const;
const ACCT_FILTERS = ["All", "Asset", "Liability", "Income", "Expense"] as const;

const ACCT_TYPE_ORDER = ["asset", "liability", "equity", "income", "expense"] as const;
const ACCT_TYPE_LABEL: Record<string, string> = {
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

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

/** "Today — 15 Jul 2026" / "Yesterday" / "12 Jul 2026" for a journal date group. */
function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const pretty = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const today = new Date();
  const isSame = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (isSame(d, today)) return `Today · ${pretty}`;
  if (isSame(d, yesterday)) return `Yesterday · ${pretty}`;
  return pretty;
}

export default function LedgerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const shadow = useHardShadow();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Journal");
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [acctFilter, setAcctFilter] = useState<(typeof ACCT_FILTERS)[number]>("All");
  const [acctSearch, setAcctSearch] = useState("");
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const accounts = useAccounts();
  const entries = useEntries();
  const balances = useTrialBalance();
  const { reverseEntry } = useLedgerMutations();
  const { from, to } = monthRange();
  const incomeStatement = useIncomeStatement(from, to);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([accounts.refetch(), entries.refetch(), balances.refetch(), incomeStatement.refetch()]);
    setRefreshing(false);
  };
  const refreshControl = useThemedRefreshControl(refreshing, onRefresh);

  // No quick-add listener any more. Ledger used to own the entry sheet, so
  // every route to it went "navigate here, bump a counter in the store, let
  // this screen notice". Now that new entry is its own route both callers push
  // it directly — and keeping the listener would have double-pushed, since
  // Home bumps the counter (to carry the AI draft) *and* navigates.

  const filteredEntries = useMemo(() => {
    let list = entries.data ?? [];
    if (search) list = list.filter((e) => e.description.toLowerCase().includes(search.toLowerCase()));
    if (filter === "Manual" || filter === "Statement") {
      list = list.filter((e) => e.source === filter.toLowerCase());
    } else if (filter === "Income" || filter === "Expense") {
      list = list.filter((e) =>
        e.postings.some((p) => accounts.data?.find((a) => a.id === p.account_id)?.type === filter.toLowerCase()),
      );
    }
    return list;
  }, [entries.data, search, filter, accounts.data]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filteredEntries> = {};
    for (const entry of filteredEntries) (groups[entry.entry_date] ??= []).push(entry);
    const factor = sortDir === "desc" ? -1 : 1;
    return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1) * factor);
  }, [filteredEntries, sortDir]);

  // Accounts grouped by type, filtered by search + type chip.
  const groupedAccounts = useMemo(() => {
    const list = (accounts.data ?? []).filter((a) => {
      if (acctFilter !== "All" && a.type !== acctFilter.toLowerCase()) return false;
      if (acctSearch && !`${a.code} ${a.name}`.toLowerCase().includes(acctSearch.toLowerCase())) return false;
      return true;
    });
    return ACCT_TYPE_ORDER.map((type) => ({ type, items: list.filter((a) => a.type === type) })).filter(
      (g) => g.items.length > 0,
    );
  }, [accounts.data, acctFilter, acctSearch]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageShell
        animateOn={tab}
        transparent
        refreshControl={refreshControl}
        // The tab strip pins with the title rather than scrolling away on its
        // own: it is the primary control on this screen, and a pinned title
        // above a vanished Accounts/Journal switcher is worse than pinning
        // neither.
        header={
          <>
            <View className="flex-row items-center px-5 pt-2.5">
              <Text style={{ letterSpacing: -0.8 }} className="flex-1 font-sans-extrabold text-[27px] text-foreground">
                Ledger
              </Text>
              <AnimatedPressable
                onPress={() => (tab === "Accounts" ? setAddAccountOpen(true) : router.push("/new-entry"))}
                haptic="light"
                className="h-11 w-11 items-center justify-center rounded-[11px] border-2 border-foreground bg-card"
              >
                <Plus size={21} color={colors.accent} strokeWidth={2.4} />
              </AnimatedPressable>
            </View>

            <TourTarget id="ledger-tabs">
              <Tabs className="mt-3" items={TABS} value={tab} onChange={setTab} />
            </TourTarget>
          </>
        }
      >

      {tab === "Journal" ? (
        <>
          <View className="flex-row items-center gap-2 px-4 pb-2 pt-2.5">
            <View className="h-[38px] flex-1 flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3">
              <Search size={15} color={colors.mutedForeground} strokeWidth={2} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search entries..."
                placeholderTextColor="rgba(128,128,128,0.4)"
                className="flex-1 text-[15px] text-foreground"
              />
            </View>
            <AnimatedPressable
              onPress={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="h-[38px] flex-row items-center gap-1.5 rounded-card border-2 border-foreground bg-card px-3"
            >
              {sortDir === "desc" ? (
                <ArrowDown size={15} color={colors.mutedForeground} strokeWidth={2} />
              ) : (
                <ArrowUp size={15} color={colors.mutedForeground} strokeWidth={2} />
              )}
              <Text className="font-sans-medium text-[15px] text-muted-foreground">
                {sortDir === "desc" ? "Newest" : "Oldest"}
              </Text>
            </AnimatedPressable>
          </View>
          <View className="flex-row flex-wrap gap-1.5 px-4 pb-2.5">
            {TYPE_FILTERS.map((f) => (
              <FilterChip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
            ))}
          </View>

          <View className="gap-1.5 px-4">
            {grouped.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[15px] text-muted-foreground">No entries yet. Post your first one.</Text>
              </Card>
            ) : (
              grouped.map(([date, dayEntries]) => (
                <View key={date}>
                  <Text className="px-0.5 pb-1 pt-1.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    {dateGroupLabel(date)}
                  </Text>
                  <View className="gap-3.5">
                    {dayEntries.map((entry) => {
                      const debit = entry.postings.find((p) => p.direction === 1);
                      const credit = entry.postings.find((p) => p.direction === -1);
                      const debitAcc = accounts.data?.find((a) => a.id === debit?.account_id);
                      const creditAcc = accounts.data?.find((a) => a.id === credit?.account_id);
                      const isIncome = debitAcc?.type === "asset" && creditAcc?.type === "income";
                      const reversed = Boolean(entry.reversed_by);
                      return (
                        // The mockup's journal card: description and amount on
                        // one baseline row, a quiet meta line, then the two
                        // postings as DR/CR code chips. The old row spent its
                        // widest line on "DR: <long name> · CR: <long name>",
                        // truncated so neither account was legible, and put a
                        // 3px colour rail where the chips now carry that signal.
                        <AnimatedPressable
                          key={entry.id}
                          onPress={() => setSelectedEntry(entry)}
                          press="sink"
                          className={cn("rounded-card border-2 border-foreground bg-card p-[15px]", reversed && "opacity-40")}
                          style={reversed ? undefined : shadow}
                        >
                          <View className="flex-row items-baseline gap-2.5">
                            <Text
                              numberOfLines={2}
                              className={cn("flex-1 font-sans-bold text-[17px] text-foreground", reversed && "line-through")}
                            >
                              {entry.description}
                            </Text>
                            <Text className="shrink-0 font-sans-extrabold text-[17px] text-foreground">
                              {isIncome ? "+" : "−"}Rs. {formatLKR(debit?.amount ?? "0", 0)}
                            </Text>
                          </View>
                          <Text className="mt-1.5 text-[13.5px] text-muted-foreground">
                            {entry.entry_date} · {entry.postings.length} posting
                            {entry.postings.length === 1 ? "" : "s"}
                            {entry.source === "statement" ? " · imported" : ""}
                            {reversed ? " · reversed" : ""}
                          </Text>
                          <View className="mt-3 flex-row flex-wrap gap-2">
                            <PostingChip side="DR" code={debitAcc?.code} />
                            <PostingChip side="CR" code={creditAcc?.code} />
                          </View>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      ) : null}

      {tab === "Accounts" ? (
        <>
          <View className="px-4 pb-2 pt-2.5">
            <View className="h-[38px] flex-row items-center gap-2 rounded-card border-2 border-foreground bg-card px-3">
              <Search size={15} color={colors.mutedForeground} strokeWidth={2} />
              <TextInput
                value={acctSearch}
                onChangeText={setAcctSearch}
                placeholder="Search accounts..."
                placeholderTextColor="rgba(128,128,128,0.4)"
                className="flex-1 text-[15px] text-foreground"
              />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-1.5 px-4 pb-2.5">
            {ACCT_FILTERS.map((f) => (
              <FilterChip key={f} label={f} active={acctFilter === f} onPress={() => setAcctFilter(f)} />
            ))}
          </View>

          <View className="gap-3 px-4">
            {groupedAccounts.length === 0 ? (
              <Card className="items-center p-6">
                <Text className="text-[15px] text-muted-foreground">No accounts match.</Text>
              </Card>
            ) : (
              groupedAccounts.map((group) => {
                const Icon = ACCT_ICON[group.type] ?? Landmark;
                const isAsset = group.type === "asset";
                return (
                  <View key={group.type}>
                    <Text className="mb-1.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                      {ACCT_TYPE_LABEL[group.type]} · {group.items.length} account{group.items.length === 1 ? "" : "s"}
                    </Text>
                    <View className="gap-3.5">
                      {group.items.map((a) => {
                        const bal = balances.data?.[a.id];
                        return (
                          <AnimatedPressable
                            key={a.id}
                            onPress={() => setSelectedAccountId(a.id)}
                            press="sink"
                            className={cn("flex-row items-center gap-[13px] rounded-card border-2 border-foreground bg-card p-[15px]", !a.is_active && "opacity-45")}
                            style={a.is_active ? shadow : undefined}
                          >
                            {/* `.avatar` from the mockup: a lettered square,
                                accent-filled for the accounts that actually
                                hold money. A glyph could only ever say "bank",
                                which every row here already is — the initial
                                distinguishes them at a glance instead. */}
                            <View
                              className={cn(
                                "h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border-2 border-foreground",
                                isAsset ? "bg-salli-accent" : "bg-card",
                              )}
                            >
                              <Text
                                className="font-sans-extrabold text-[17px]"
                                style={{ color: isAsset ? "#FFFFFF" : colors.foreground }}
                              >
                                {a.name.trim().charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text numberOfLines={1} className="font-sans-bold text-[17px] text-foreground">
                                {a.name}
                              </Text>
                              <Text numberOfLines={1} className="mt-0.5 text-[13.5px] text-muted-foreground">
                                {a.code} · {a.currency}
                                {a.is_active ? "" : " · Inactive"}
                              </Text>
                            </View>
                            {/* Right-aligned amount with its side underneath,
                                as the mockup has it. shrink-0 because the
                                balance is the one thing on the row that must
                                never be clipped. No chevron: the whole row is
                                the target and the mockup shows none. */}
                            <View className="shrink-0 items-end">
                              <Text className="font-sans-extrabold text-[17px] text-foreground">
                                {bal !== undefined ? `Rs. ${formatLKRAbbrev(bal)}` : "—"}
                              </Text>
                              <Text className="mt-0.5 font-mono text-[12px] text-muted-foreground">
                                {isAsset ? "DR" : "CR"}
                              </Text>
                            </View>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      ) : null}

      {tab === "Income Stmt" ? (
        <View className="px-4 pt-4">
          <Card className="bg-salli-hero p-5">
            <Text className="mb-1 text-[11px] font-mono uppercase tracking-widest text-white/40">
              Net Income · {from} → {to}
            </Text>
            <Text className="font-sans-extrabold text-[32px] tracking-tight text-white">
              Rs. {incomeStatement.data ? formatLKR(incomeStatement.data.net_income) : "—"}
            </Text>
          </Card>
        </View>
      ) : null}

      <EntryDetailSheet
        entry={selectedEntry}
        accounts={(accounts.data ?? []) as Account[]}
        onClose={() => setSelectedEntry(null)}
        onReverse={reverseEntry}
      />
      <AccountDetailModal
        visible={Boolean(selectedAccountId)}
        accountId={selectedAccountId}
        onClose={() => setSelectedAccountId(null)}
      />
      <AddEditAccountDrawer visible={addAccountOpen} onClose={() => setAddAccountOpen(false)} />
      </PageShell>
    </View>
  );
}
