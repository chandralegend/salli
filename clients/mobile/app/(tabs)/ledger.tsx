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
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AccountDetailModal } from "@/components/AccountDetailModal";
import { AddEditAccountDrawer } from "@/components/AddEditAccountDrawer";
import { EntryDetailSheet } from "@/components/EntryDetailSheet";
import { NewEntryModal } from "@/components/NewEntryModal";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
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
  type EntryDraft,
} from "@/hooks/useLedger";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";
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
  if (isSame(d, today)) return `Today — ${pretty}`;
  if (isSame(d, yesterday)) return `Yesterday — ${pretty}`;
  return pretty;
}

export default function LedgerScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Journal");
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>("All");
  const [search, setSearch] = useState("");
  const [acctFilter, setAcctFilter] = useState<(typeof ACCT_FILTERS)[number]>("All");
  const [acctSearch, setAcctSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<EntryDraft | null>(null);

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

  const quickAddEntryRequest = useSalliStore((s) => s.quickAddEntryRequest);
  useEffect(() => {
    if (quickAddEntryRequest > 0) {
      // Snapshot any AI draft attached to this request (null for a plain "+").
      setEntryDraft(useSalliStore.getState().quickAddDraft);
      setTab("Journal");
      setModalVisible(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickAddEntryRequest]);

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
              <Text className="flex-1 font-sans-bold text-[26px] text-foreground">Ledger</Text>
              <AnimatedPressable
                onPress={() => (tab === "Accounts" ? setAddAccountOpen(true) : setModalVisible(true))}
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
                <Text className="text-[15px] text-muted-foreground">No entries yet — post your first one.</Text>
              </Card>
            ) : (
              grouped.map(([date, dayEntries]) => (
                <View key={date}>
                  <Text className="px-0.5 pb-1 pt-1.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    {dateGroupLabel(date)}
                  </Text>
                  <View className="gap-1.5">
                    {dayEntries.map((entry) => {
                      const debit = entry.postings.find((p) => p.direction === 1);
                      const credit = entry.postings.find((p) => p.direction === -1);
                      const debitAcc = accounts.data?.find((a) => a.id === debit?.account_id);
                      const creditAcc = accounts.data?.find((a) => a.id === credit?.account_id);
                      const isIncome = debitAcc?.type === "asset" && creditAcc?.type === "income";
                      const reversed = Boolean(entry.reversed_by);
                      return (
                        <AnimatedPressable
                          key={entry.id}
                          onPress={() => setSelectedEntry(entry)}
                          className={cn("flex-row gap-2.5 rounded-card border-2 border-foreground bg-card p-3", reversed && "opacity-40")}
                        >
                          <View className={cn("mt-0.5 h-9 w-[3px] rounded-pill", isIncome ? "bg-salli-accent" : "bg-foreground/15")} />
                          <View className="flex-1">
                            <View className="mb-1 flex-row items-start justify-between gap-2">
                              <Text numberOfLines={1} className={cn("flex-1 font-sans-semibold text-[15px] text-foreground", reversed && "line-through")}>
                                {entry.description}
                              </Text>
                              <Text className={cn("font-sans-bold text-[15px]", isIncome ? "text-foreground" : "text-foreground/60")}>
                                {isIncome ? "+" : "−"}Rs. {formatLKR(debit?.amount ?? "0", 0)}
                              </Text>
                            </View>
                            <Text numberOfLines={1} className="mb-1 text-[13px] text-muted-foreground">
                              DR: {debitAcc?.name ?? "—"} · CR: {creditAcc?.name ?? "—"}
                            </Text>
                            <View className={cn("self-start rounded-badge border-[1.5px] border-foreground px-1.5 py-0.5", entry.source === "statement" ? "bg-salli-accent/15" : "bg-foreground/[0.07]")}>
                              <Text className={cn("text-[13px] font-sans-medium capitalize", entry.source === "statement" ? "text-salli-accent" : "text-muted-foreground")}>
                                {reversed ? "(reversed)" : entry.source}
                              </Text>
                            </View>
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
                    <View className="gap-1.5">
                      {group.items.map((a) => {
                        const bal = balances.data?.[a.id];
                        return (
                          <AnimatedPressable
                            key={a.id}
                            onPress={() => setSelectedAccountId(a.id)}
                            className={cn("flex-row items-center gap-2.5 rounded-card border-2 border-foreground bg-card p-3", !a.is_active && "opacity-45")}
                          >
                            {/* No type badge and no colour rail. Both repeated
                                what the section heading above already says
                                ("ASSETS · 11 ACCOUNTS"), and the badge had no
                                shrink, so on a long account name it pushed out
                                of the flex child and rendered on top of the
                                balance. The icon still carries asset-vs-other. */}
                            <View
                              className={cn(
                                "h-10 w-10 items-center justify-center rounded-card border-2",
                                isAsset ? "border-salli-accent bg-salli-accent/10" : "border-foreground bg-muted",
                              )}
                            >
                              <Icon size={18} color={isAsset ? colors.accent : colors.mutedForeground} strokeWidth={2} />
                            </View>
                            <View className="min-w-0 flex-1">
                              <Text numberOfLines={1} className="font-sans-semibold text-[16px] text-foreground">
                                {a.name}
                              </Text>
                              <Text numberOfLines={1} className="mt-0.5 text-[14px] text-muted-foreground">
                                {a.code} · {a.currency}
                                {a.is_active ? "" : " · Inactive"}
                              </Text>
                            </View>
                            {/* shrink-0: the balance is the one thing on the row
                                that must never be clipped or overlapped. */}
                            <View className="shrink-0 flex-row items-center gap-1.5">
                              <Text className={cn("font-sans-bold text-[15px]", isAsset ? "text-foreground" : "text-foreground/60")}>
                                {bal !== undefined ? `Rs. ${formatLKRAbbrev(bal)}` : "—"}
                              </Text>
                              <ChevronRight size={15} color={colors.mutedForeground} strokeWidth={2} />
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

      <NewEntryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        accounts={accounts.data ?? []}
        initialDraft={entryDraft}
      />
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
