import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pencil, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ActionButton } from "@/components/ui/action-button";
import { Hero, Meter, Rule, Said, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { IconButton } from "@/components/ui/icon-button";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useBudgetSummaryFull, useBudgets, useCreateBudget, useUpdateBudget } from "@/hooks/useBudget";
import { useFiSurplus } from "@/hooks/useFi";
import { useAccounts } from "@/hooks/useLedger";
import { getScoreFiScoreGet } from "@/lib/api/sdk.gen";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const PRESETS: { label: string; value: number }[] = [
  { label: "60K", value: 60000 },
  { label: "84K", value: 84000 },
  { label: "1L", value: 100000 },
  { label: "1.2L", value: 120000 },
];

/** Small counts read as words in a sentence and as digits in a figure. Money
 *  is always digits; a day count this size is not. */
const WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];
const inWords = (n: number) => WORDS[n] ?? String(n);

function monthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

/**
 * How much of the budget period is left, as a sentence.
 *
 * Parsed from the period's own end date rather than from today's month, because
 * the summary you are looking at is not necessarily the current month's — an
 * older budget still renders, and captioning it "nine days left" would be a
 * lie. A closed period says so.
 */
function periodTailSentence(periodEnd: string): string {
  const [y, m, d] = periodEnd.split("-").map(Number);
  if (!y || !m || !d) return "";
  const end = new Date(y, m - 1, d);
  const month = MONTHS[m - 1];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((end.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${month} has closed.`;
  if (days === 0) return `Last day of ${month}.`;
  if (days === 1) return `One day left in ${month}.`;
  return `${inWords(days)} days left in ${month}.`;
}

export default function BudgetScreen() {
  const router = useRouter();
  const budgets = useBudgets();
  const accounts = useAccounts();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const latestBudget = budgets.data?.[0];
  const summary = useBudgetSummaryFull(latestBudget?.id);
  const [editing, setEditing] = useState(false);

  // The needs/wants/savings split is the same server figure the Freedom tab
  // reads, under the same query key — so this is a cache hit, not a second
  // computation, whenever Freedom has been opened.
  const surplus = useFiSurplus();

  const fiScore = useQuery({
    queryKey: ["fi-score"],
    queryFn: async () => {
      const { data } = await getScoreFiScoreGet({ throwOnError: true });
      return data as unknown as { monthly_income: string } | null;
    },
  });

  const expenseAccounts = useMemo(
    () => (accounts.data ?? []).filter((a) => a.type === "expense"),
    [accounts.data],
  );
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [monthlyLimit, setMonthlyLimit] = useState(0);

  const avgIncome = Number(fiScore.data?.monthly_income ?? 0);
  const recommended = avgIncome > 0 ? Math.round(avgIncome * 0.7) : 0;
  const allocated = Object.values(limits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const effectiveLimit = monthlyLimit || recommended || allocated;
  const pct = avgIncome > 0 && effectiveLimit > 0 ? Math.round((effectiveLimit / avgIncome) * 100) : null;
  const unallocated = effectiveLimit - allocated;

  const enterEdit = () => {
    const pre: Record<string, string> = {};
    let total = 0;
    (latestBudget?.lines ?? []).forEach((l) => {
      pre[l.account_id] = String(Math.round(Number(l.limit_amount)));
      total += Number(l.limit_amount);
    });
    setLimits(pre);
    setMonthlyLimit(total);
    setEditing(true);
  };

  const autoSplit = () => {
    const target = effectiveLimit || recommended;
    if (!target || expenseAccounts.length === 0) return;
    const per = Math.round(target / expenseAccounts.length);
    setLimits(Object.fromEntries(expenseAccounts.map((a) => [a.id, String(per)])));
  };

  const handleSave = () => {
    const { from, to } = monthRange();
    const lines = Object.entries(limits)
      .filter(([, v]) => Number(v) > 0)
      .map(([account_id, v]) => ({ account_id, limit_amount: Number(v) }));
    if (lines.length === 0) return;
    const onSuccess = () => setEditing(false);
    if (latestBudget && editing) {
      updateBudget.mutate({ id: latestBudget.id, period_start: from, period_end: to, lines }, { onSuccess });
    } else {
      createBudget.mutate({ period_start: from, period_end: to, lines }, { onSuccess });
    }
  };

  const saving = createBudget.isPending || updateBudget.isPending;
  const reviewing = Boolean(latestBudget && summary.data && !editing);

  /** Needs / wants / savings, as one sentence under a rule. Empty until
   *  spending carries `need` tags, and an empty split is "not classified yet"
   *  rather than "nothing spent" — so it is omitted rather than shown as 0%. */
  const needSplit = (() => {
    const raw = surplus.data?.expense_by_need ?? {};
    const entries = (
      [
        ["essential", "needs"],
        ["discretionary", "wants"],
        ["savings", "savings"],
      ] as const
    )
      .map(([slug, label]) => ({ label, amount: Number(raw[slug] ?? 0) }))
      .filter((e) => e.amount > 0);
    const total = entries.reduce((s, e) => s + e.amount, 0);
    if (total <= 0) return null;
    return entries.map((e) => ({ label: e.label, pct: Math.round((e.amount / total) * 100) }));
  })();

  return (
    <PageShell
      header={
        <ScreenHeader
          title={reviewing ? "Budget" : latestBudget ? "Edit budget" : "Set a budget"}
          back
          trailing={
            reviewing ? (
              <IconButton icon={Pencil} size={18} onPress={enterEdit} accessibilityLabel="Edit budget" />
            ) : undefined
          }
        />
      }
    >
      {reviewing && summary.data ? (
        (() => {
          const spent = Number(summary.data.total_actual);
          const limit = Number(summary.data.total_limit);
          const remaining = limit - spent;
          const over = remaining < 0;
          const tail = periodTailSentence(summary.data.period_end);
          return (
            <View>
              {/* The screen opens by saying the one thing it is for. The dark
                  hero card this replaces stated the same figure three times —
                  as a 40px number, as a "% used" chip and as "of Rs. 1.6L"
                  underneath. */}
              <View className="px-5">
                <Hero>
                  You&rsquo;ve spent <Strong>Rs. {formatLKRAbbrev(spent)}</Strong> of{" "}
                  <Strong>Rs. {formatLKRAbbrev(limit)}</Strong>.
                </Hero>
                <Text
                  className={`mt-2 text-[16px] leading-[23px] ${
                    over ? "font-sans-semibold text-salli-accent" : "text-muted-foreground"
                  }`}
                >
                  {over
                    ? `Over by Rs. ${formatLKRAbbrev(Math.abs(remaining))}. ${tail}`
                    : `Rs. ${formatLKRAbbrev(remaining)} left. ${tail}`}
                </Text>
                <Meter className="mt-4" value={limit > 0 ? spent / limit : 0} over={over} />
              </View>

              <Rule />

              <SectionLabel>By category</SectionLabel>
              <View className="mt-3 gap-[13px] px-5">
                {summary.data.lines.map((line, i) => {
                  const actual = Number(line.actual_amount);
                  const lim = Number(line.limit_amount);
                  const lineOver = actual > lim;
                  return (
                    <Card key={i} className={`p-[15px] ${lineOver ? "border-salli-accent" : ""}`}>
                      <View className="flex-row items-baseline justify-between gap-2.5">
                        <Text
                          numberOfLines={1}
                          className="min-w-0 flex-1 font-sans-bold text-[17px] text-foreground"
                        >
                          {line.category}
                        </Text>
                        <Text className="shrink-0 text-[13.5px] text-muted-foreground">
                          <Text
                            className={`font-sans-bold ${
                              lineOver ? "text-salli-accent" : "text-foreground"
                            }`}
                          >
                            Rs. {formatLKRAbbrev(actual)}
                          </Text>{" "}
                          / {formatLKRAbbrev(lim)}
                        </Text>
                      </View>
                      <Meter className="mt-[11px]" value={lim > 0 ? actual / lim : 0} over={lineOver} />
                      {lineOver ? (
                        <Text className="mt-[9px] text-[13.5px] text-salli-accent">
                          Over by Rs. {formatLKR(actual - lim, 0)}.
                        </Text>
                      ) : null}
                    </Card>
                  );
                })}
                {summary.data.lines.length === 0 ? (
                  <Card className="p-[15px]">
                    <Text className="text-[15px] leading-[21px] text-muted-foreground">
                      This budget has no category limits. Tap the pencil to add some.
                    </Text>
                  </Card>
                ) : null}
              </View>

              {needSplit ? (
                <>
                  <Rule />
                  <View className="px-5">
                    <Said>
                      {needSplit.map((n, i) => (
                        <Text key={n.label}>
                          {i > 0 ? " · " : ""}
                          {i === 0 ? n.label.charAt(0).toUpperCase() + n.label.slice(1) : n.label}{" "}
                          <Strong>{n.pct}%</Strong>
                        </Text>
                      ))}
                      .
                    </Said>
                  </View>
                </>
              ) : null}
              <View className="h-7" />
            </View>
          );
        })()
      ) : (
        <View>
          {/* Setup is not in the mockup, so it follows the same grammar as the
              review view: the sentence states the decision being made, the
              meter shows it against income, and the categories are cards. */}
          <View className="px-5">
            <Hero>
              {effectiveLimit > 0 ? (
                <>
                  You&rsquo;ll spend at most <Strong>Rs. {formatLKR(effectiveLimit, 0)}</Strong> a month.
                </>
              ) : (
                <>How much do you want to spend each month?</>
              )}
            </Hero>
            <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
              {avgIncome > 0
                ? pct !== null
                  ? `That is ${pct}% of your Rs. ${formatLKRAbbrev(avgIncome)} average income. Under 80% is comfortable.`
                  : `Your average income is Rs. ${formatLKRAbbrev(avgIncome)} a month.`
                : "Pick a figure, or set limits per category below and we will total them."}
            </Text>
            {pct !== null ? <Meter className="mt-4" value={pct / 100} over={pct > 80} /> : null}
          </View>

          <View className="mt-4 flex-row flex-wrap items-center gap-1.5 px-5">
            {PRESETS.map((p) => (
              <FilterChip
                key={p.label}
                label={p.label}
                active={monthlyLimit === p.value}
                onPress={() => setMonthlyLimit(p.value)}
              />
            ))}
          </View>

          <Rule />

          <SectionLabel
            trailing={
              <Pressable onPress={autoSplit} hitSlop={8}>
                <Text className="font-sans-semibold text-[14px] text-salli-accent">Auto-split</Text>
              </Pressable>
            }
          >
            By category
          </SectionLabel>

          <View className="mt-3 gap-[13px] px-5">
            {expenseAccounts.length === 0 ? (
              <Card className="p-[15px]">
                <Text className="text-[15px] leading-[21px] text-muted-foreground">
                  No expense accounts to budget yet.
                </Text>
              </Card>
            ) : (
              expenseAccounts.map((a) => {
                const value = Number(limits[a.id] ?? 0);
                return (
                  <Card key={a.id} className="p-[15px]">
                    <View className="flex-row items-center justify-between gap-2.5">
                      <Text
                        numberOfLines={1}
                        className="min-w-0 flex-1 font-sans-bold text-[17px] text-foreground"
                      >
                        {a.name}
                      </Text>
                      <View className="shrink-0 flex-row items-center gap-1 rounded-badge border-[1.5px] border-foreground bg-muted px-2.5 py-1">
                        <Text className="font-mono text-[13px] text-muted-foreground">Rs.</Text>
                        <TextInput
                          value={limits[a.id] ?? ""}
                          onChangeText={(v) => setLimits((prev) => ({ ...prev, [a.id]: v }))}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="rgba(128,128,128,0.5)"
                          style={{ width: 62 }}
                          className="p-0 text-right font-sans-bold text-[15px] text-foreground"
                        />
                      </View>
                    </View>
                    <Meter
                      className="mt-[11px]"
                      value={effectiveLimit > 0 ? value / effectiveLimit : 0}
                    />
                  </Card>
                );
              })
            )}
            {/* A budget line is an expense account, so "add a category" means
                creating one — which happens in the Ledger. This used to be a
                Pressable with no onPress at all: it looked like a control and
                did nothing. */}
            <Pressable
              onPress={() => router.push("/(tabs)/ledger")}
              className="flex-row items-center gap-3 rounded-card border-2 border-dashed border-foreground/30 px-[15px] py-3.5"
            >
              <Plus size={18} color="rgba(128,128,128,0.8)" strokeWidth={2.5} />
              <Text className="flex-1 text-[15px] leading-[21px] text-muted-foreground">
                Categories are your expense accounts — add one in the Ledger.
              </Text>
            </Pressable>
          </View>

          {effectiveLimit > 0 ? (
            <>
              <Rule tight />
              <View className="px-5">
                <Text
                  className={`text-[15px] leading-[21px] ${
                    unallocated < 0 ? "font-sans-semibold text-salli-accent" : "text-muted-foreground"
                  }`}
                >
                  {unallocated < 0
                    ? `Your category limits exceed the monthly figure by Rs. ${formatLKR(Math.abs(unallocated), 0)}.`
                    : `Rs. ${formatLKR(unallocated, 0)} of the monthly figure is still unallocated.`}
                </Text>
              </View>
            </>
          ) : null}

          <View className="mt-5 px-5">
            <ActionButton loading={saving} disabled={allocated === 0} onPress={handleSave}>
              {editing ? "Update budget" : "Save budget"}
            </ActionButton>
            <Pressable
              onPress={() => (editing ? setEditing(false) : router.back())}
              className="mt-3.5 items-center py-1"
            >
              <Text className="text-[15px] text-muted-foreground">
                {editing ? "Cancel" : "Not now"}
              </Text>
            </Pressable>
          </View>
          <View className="h-7" />
        </View>
      )}
    </PageShell>
  );
}
