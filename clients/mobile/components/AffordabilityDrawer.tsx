import { ArrowRight, ShieldAlert, TriangleAlert } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Drawer } from "@/components/ui/drawer";
import { FilterChip } from "@/components/ui/filter-chip";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import type { PurchaseImpact, PurchaseOption } from "@/hooks/useFi";
import { useSimulatePurchase } from "@/hooks/useFi";
import { formatLKR } from "@/lib/format";
import { useAppTheme, useThemeColors } from "@/lib/theme";

/** "1 month" / "9 months" / "1 yr 5 mo" — months are the unit users think in. */
function monthsLabel(months: number): string {
  if (months === 0) return "no delay";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m === 0 ? `${y} yr${y === 1 ? "" : "s"}` : `${y} yr ${m} mo`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const TERM_OPTIONS: { label: string; months: number | null }[] = [
  { label: "Cash", months: null },
  { label: "6 mo", months: 6 },
  { label: "12 mo", months: 12 },
  { label: "24 mo", months: 24 },
];

function Badge({ tone, label }: { tone: "success" | "danger"; label: string }) {
  return (
    <View className={tone === "success" ? "rounded-badge bg-salli-success/15 px-1.5 py-0.5" : "rounded-badge bg-destructive/15 px-1.5 py-0.5"}>
      <Text className={tone === "success" ? "text-[12px] font-sans-semibold text-salli-success" : "text-[12px] font-sans-semibold text-destructive"}>
        {label}
      </Text>
    </View>
  );
}

function OptionRow({ option, currency, cheapest }: { option: PurchaseOption; currency: string; cheapest: boolean }) {
  return (
    <View className="flex-row items-start justify-between gap-3 border-t border-foreground/[0.06] py-2.5">
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="font-sans-semibold text-[15px] text-foreground">{option.label}</Text>
          {cheapest ? <Badge tone="success" label="cheapest" /> : null}
          {option.exceeds_monthly_surplus ? <Badge tone="danger" label="over your surplus" /> : null}
        </View>
        <Text className="mt-1 text-[14px] text-foreground/40">
          {currency} {formatLKR(option.total_cost)}
          {Number(option.interest_cost) > 0 ? ` · ${currency} ${formatLKR(option.interest_cost)} interest` : ""}
          {option.monthly_payment ? ` · ${currency} ${formatLKR(option.monthly_payment)}/mo` : ""}
        </Text>
      </View>
      <Text className="font-sans-bold text-[16px] text-foreground">
        {option.months_delay === null ? "—" : `+${monthsLabel(option.months_delay)}`}
      </Text>
    </View>
  );
}

function Result({ impact, mutedColor, destructiveColor }: { impact: PurchaseImpact; mutedColor: string; destructiveColor: string }) {
  const { currency } = impact;

  // A stale balance sheet gets no verdict — advice from an old picture is
  // worse than none, and the user can't un-spend on a false "yes."
  if (impact.is_stale) {
    return (
      <View className="mt-4 flex-row items-start gap-2.5 rounded-card border border-dashed border-foreground/15 p-3.5">
        <TriangleAlert size={18} color={mutedColor} strokeWidth={2} style={{ marginTop: 1 }} />
        <View className="flex-1">
          <Text className="font-sans-semibold text-[15px] text-foreground">Your ledger is out of date</Text>
          <Text className="mt-1 text-[14px] text-foreground/40">
            {impact.data_as_of ? `The newest entry is from ${formatShortDate(impact.data_as_of)}.` : "There are no entries yet."}{" "}
            Bring it up to date and ask again.
          </Text>
        </View>
      </View>
    );
  }

  const headline = impact.options.find((o) => o.key === impact.cheapest_option_key) ?? impact.options[0];
  const efAfter = Number(impact.emergency_months_after_cash);
  const efTarget = impact.emergency_fund_target_months;
  const efBreached = efAfter < efTarget;

  return (
    <View className="mt-4">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">Costs you</Text>
          {headline?.months_delay === null ? (
            <>
              <Text className="mt-1.5 font-sans-bold text-[26px] text-foreground">Not yet knowable</Text>
              <Text className="mt-1.5 text-[14px] text-foreground/40">
                Your Freedom date isn&rsquo;t reachable yet — it isn&rsquo;t free.
              </Text>
            </>
          ) : (
            <>
              <Text className="mt-1.5 font-sans-bold text-[26px] text-foreground">{monthsLabel(headline?.months_delay ?? 0)}</Text>
              <Text className="mt-1.5 text-[14px] text-foreground/40">of freedom, cheapest way</Text>
            </>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[13px] font-sans-medium uppercase tracking-wide text-foreground/35">Emergency fund</Text>
          <Text className={efBreached ? "mt-1.5 font-sans-bold text-[26px] text-destructive" : "mt-1.5 font-sans-bold text-[26px] text-foreground"}>
            {efAfter.toFixed(1)} mo
          </Text>
          <Text className="mt-1.5 text-[14px] text-foreground/40">
            from {Number(impact.emergency_months_before).toFixed(1)} mo · target {efTarget} mo
          </Text>
        </View>
      </View>

      {efBreached || !impact.payable_from_liquid ? (
        <View className="mt-3.5 flex-row items-start gap-2.5 rounded-card border border-destructive/30 bg-destructive/5 p-3">
          <ShieldAlert size={17} color={destructiveColor} strokeWidth={2} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[14px] text-foreground/70">
            {!impact.payable_from_liquid
              ? "This is more than your liquid savings — paying cash would leave you short."
              : `Paying cash drops your buffer below the ${efTarget}-month target.`}
          </Text>
        </View>
      ) : null}

      <View className="mt-3.5">
        {impact.options.map((o) => (
          <OptionRow key={o.key} option={o} currency={currency} cheapest={o.key === impact.cheapest_option_key && impact.options.length > 1} />
        ))}
      </View>

      <Text className="mt-3 text-[13px] text-foreground/25">
        Deterministic engine · as of {impact.data_as_of ? formatShortDate(impact.data_as_of) : "today"} · information, not formal financial advice
      </Text>
    </View>
  );
}

export function AffordabilityDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const { isDark } = useAppTheme();
  const destructiveColor = isDark ? "#EF4444" : "#DC2626";
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState<number | null>(null);
  const sim = useSimulatePurchase();

  useEffect(() => {
    if (visible) {
      setAmount("");
      setTerm(null);
      sim.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const clean = amount.replace(/,/g, "").trim();
  const valid = clean !== "" && Number(clean) > 0 && Number.isFinite(Number(clean));

  const submit = () => {
    if (!valid) return;
    sim.mutate({
      amount: clean,
      term_months: term,
      // 18% is the common Sri Lankan card-instalment rate; only applied when
      // a term is chosen. Sent as a fraction, never a percentage.
      annual_interest_rate: term ? "0.18" : "0",
    });
  };

  return (
    <Drawer visible={visible} onClose={onClose} title="Can I afford this?">
      <TextField
        label="Purchase amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
      />

      <View className="mb-1 mt-3 flex-row flex-wrap gap-1.5">
        {TERM_OPTIONS.map((t) => (
          <FilterChip key={t.label} label={t.label} active={term === t.months} onPress={() => setTerm(t.months)} />
        ))}
      </View>

      <ActionButton className="mt-3" variant="accent" loading={sim.isPending} disabled={!valid || sim.isPending} onPress={submit}>
        {sim.isPending ? "Working…" : (
          <View className="flex-row items-center gap-1.5">
            <Text className="font-sans-semibold text-[18px] text-white">Ask Salli</Text>
            <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
          </View>
        )}
      </ActionButton>

      {!sim.data && !sim.isPending && !sim.isError ? (
        <Text className="mt-3 text-[14px] text-foreground/35">
          Salli prices it against what you own, owe and will owe in tax — and tells you what it costs your Freedom date.
        </Text>
      ) : null}

      {sim.isError ? (
        <Text className="mt-3 text-[14px] text-destructive">Couldn&rsquo;t price that purchase. Check the amount and try again.</Text>
      ) : null}

      {sim.data ? <Result impact={sim.data} mutedColor={colors.mutedForeground} destructiveColor={destructiveColor} /> : null}
    </Drawer>
  );
}
