import { Bell, CreditCard, Info, Landmark, Percent, User } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TourTarget } from "@/components/tour/TourTarget";
import { StatTile } from "@/components/ui/stat-tile";
import { Tabs } from "@/components/ui/tabs";
import type { TaxComputationFull, TaxPack } from "@/hooks/useTax";
import { useComputeTax, useLatestTax, useTaxHistory, useTaxPacks } from "@/hooks/useTax";
import { useReminderMutations } from "@/hooks/useReminders";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { dueDateLabel, filingDueDate } from "@/lib/taxDates";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = "2025/26";
const TABS = ["Overview", "Deductions", "History"] as const;
type Tab = (typeof TABS)[number];

function effRate(r: TaxComputationFull): number {
  return Number(r.tax_payable) / Number(r.gross_income || 1);
}

type BandStatus = "full" | "partial" | "unused";

/**
 * How much of a progressive band was consumed.
 *
 * Reads the numeric bounds the server sends. It used to regex them back out of
 * the display label ("LKR 0 – LKR 1,000,000"), which meant any change to that
 * string — the currency prefix, the separator, the dash character — silently
 * turned every band into "Applied to top band".
 *
 * The label is still parsed as a fallback, because `/tax/latest` replays stored
 * rows and ones written before the numeric fields existed don't carry them.
 */
function bandUsage(
  band: { band: string; taxable_in_band: string; from_amount?: string; to_amount?: string | null },
): { status: BandStatus; detail: string } {
  const taxable = Number(band.taxable_in_band);
  if (!(taxable > 0)) return { status: "unused", detail: "Not reached" };

  let from: number | undefined;
  let to: number | null | undefined;

  if (band.from_amount !== undefined) {
    from = Number(band.from_amount);
    to = band.to_amount == null ? null : Number(band.to_amount);
  } else {
    const nums = (band.band.match(/[\d,]+/g) ?? [])
      .map((n) => Number(n.replace(/,/g, "")))
      .filter((n) => Number.isFinite(n));
    from = nums[0];
    to = /balance/i.test(band.band) ? null : nums[1];
  }

  // The open-ended top band has no width to fill.
  if (to == null || from === undefined || !Number.isFinite(from)) {
    return { status: "full", detail: "Applied to top band" };
  }

  const width = to - from;
  if (width > 0 && taxable >= width - 1) return { status: "full", detail: "Full band applied" };
  return {
    status: "partial",
    detail: `Rs. ${formatLKRAbbrev(taxable)} of Rs. ${formatLKRAbbrev(width)} used`,
  };
}

function Disclaimer({ text }: { text: string }) {
  const colors = useThemeColors();
  return (
    <View className="mt-2.5 flex-row items-start gap-2 rounded-[8px] border border-foreground/[0.06] bg-foreground/[0.04] px-3.5 py-2.5">
      <Info size={13} color={colors.mutedForeground} strokeWidth={2} style={{ marginTop: 1 }} />
      <Text className="flex-1 text-[11px] leading-4 text-foreground/30">{text}</Text>
    </View>
  );
}

export default function TaxScreen() {
  const colors = useThemeColors();
  const [tab, setTab] = useState<Tab>("Overview");
  const tax = useLatestTax(CURRENT_YEAR);
  const compute = useComputeTax(CURRENT_YEAR);
  const packs = useTaxPacks();

  const currentPack = packs.data?.find((p) => p.year === CURRENT_YEAR);

  return (
    <PageShell
      animateOn={tab}
      header={
        // The TourTarget travels with the header — the onboarding tour measures
        // this element's position on screen, so leaving it behind in the scroll
        // area would spotlight an empty rectangle.
        <>
          <TourTarget id="tax-header">
            <ScreenHeader title="Tax" back />
          </TourTarget>
          <Tabs items={TABS} value={tab} onChange={setTab} className="mt-3" />
        </>
      }
    >

      {!tax.data ? (
        <View className="items-center gap-3 px-8 pt-10">
          <Text className="text-center font-sans-semibold text-[16px] text-foreground">Compute your tax</Text>
          <Text className="text-center text-[13px] leading-5 text-foreground/40">
            Deterministic rules engine · not AI · planning estimate only.
          </Text>
          <PillButton className="mt-2" loading={compute.isPending} onPress={() => compute.mutate()}>
            Compute Tax
          </PillButton>
        </View>
      ) : tab === "Overview" ? (
        <OverviewTab data={tax.data} pack={currentPack} colors={colors} compute={compute} />
      ) : tab === "Deductions" ? (
        <DeductionsTab data={tax.data} />
      ) : (
        <HistoryTab colors={colors} />
      )}
    </PageShell>
  );
}

function OverviewTab({
  data,
  pack,
  colors,
  compute,
}: {
  data: TaxComputationFull;
  pack: TaxPack | undefined;
  colors: ReturnType<typeof useThemeColors>;
  compute: ReturnType<typeof useComputeTax>;
}) {
  const reminders = useReminderMutations();
  const showToast = useToast();

  const handleSetReminder = () => {
    reminders.create.mutate(
      {
        kind: `Tax Filing · AY ${data.pack_year} income tax`,
        due_date: filingDueDate(pack, data.pack_year),
      },
      {
        onSuccess: () =>
          showToast(`Added to your reminders · ${dueDateLabel(pack, data.pack_year)}.`, "success"),
        onError: () => showToast("Couldn't set reminder. Please try again.", "error"),
      },
    );
  };

  // When withheld tax exceeds the liability the bill is zero and the taxpayer
  // is owed money. Showing only "Rs. 0" hid that entirely.
  const isRefund = Number(data.refund_due ?? 0) > 0;

  return (
    <View className="px-4 pt-3">
      <Card className="bg-salli-navy-card p-[18px]">
        <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
          {isRefund ? "Refund Due" : "Net Tax Payable"} · AY {data.pack_year}
        </Text>
        <View className="mb-1 flex-row items-baseline gap-1">
          <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
          <Text
            className={cn(
              "font-sans-extrabold text-[44px] tracking-tighter",
              isRefund ? "text-salli-accent" : "text-white",
            )}
          >
            {formatLKR(isRefund ? data.refund_due : data.tax_payable, 0)}
          </Text>
        </View>
        <Text className="mb-3.5 text-[11px] text-white/30">
          Eff. rate {formatPct(effRate(data), 2)} · {dueDateLabel(pack, data.pack_year)}
        </Text>
        <View className="flex-row gap-1.5">
          <StatTile onDark className="flex-1" label="Gross Income" value={`Rs. ${formatLKRAbbrev(data.gross_income)}`} />
          <StatTile onDark className="flex-1" label="Taxable" value={`Rs. ${formatLKRAbbrev(data.taxable_income)}`} />
          <StatTile onDark className="flex-1" label="APIT Credit" valueClassName="text-salli-accent" value={`-Rs. ${formatLKRAbbrev(data.apit_credit)}`} />
        </View>
      </Card>

      <Pressable
        onPress={handleSetReminder}
        disabled={reminders.create.isPending}
        className={cn(
          "mt-2.5 h-[38px] flex-row items-center justify-center gap-1.5 rounded-pill bg-salli-accent",
          reminders.create.isPending && "opacity-60",
        )}
      >
        <Bell size={13} color="#FFFFFF" strokeWidth={2} />
        <Text className="font-sans-semibold text-[12px] text-white">
          {reminders.create.isPending ? "Setting reminder…" : "Set filing reminder"}
        </Text>
      </Pressable>

      <Card className="mt-2.5 overflow-hidden p-0">
        <View className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3">
          <Text className="font-sans-semibold text-[13px] text-foreground">Progressive Tax Bands</Text>
          <Text className="text-[11px] text-foreground/25">IRD · AY {data.pack_year}</Text>
        </View>
        <View className="px-4">
          {data.band_workings.map((band, i) => {
            const { status, detail } = bandUsage(band);
            const used = status !== "unused";
            return (
              <View
                key={i}
                className={cn(
                  "flex-row items-center gap-2.5 py-2.5",
                  i < data.band_workings.length - 1 && "border-b border-foreground/[0.05]",
                )}
              >
                <View
                  className={cn(
                    "h-[34px] w-[3px] rounded-pill",
                    status === "full" ? "bg-salli-accent" : status === "partial" ? "bg-salli-accent/50" : "bg-foreground/10",
                  )}
                />
                <View className="flex-1">
                  <Text className={cn("font-sans-medium text-[12px]", used ? "text-foreground" : "text-foreground/30")}>
                    {band.band} · {band.rate}
                  </Text>
                  <Text className={cn("text-[11px]", used ? "text-foreground/30" : "text-foreground/20")}>{detail}</Text>
                </View>
                <View className="items-end gap-1">
                  <Text className={cn("font-sans-semibold text-[12px]", used ? "text-foreground" : "text-foreground/25")}>
                    {Number(band.tax) > 0 ? `Rs. ${formatLKR(band.tax, 0)}` : "—"}
                  </Text>
                  <View
                    className={cn(
                      "rounded-[4px] px-1.5 py-px",
                      status === "full" ? "bg-salli-accent/15" : status === "partial" ? "bg-foreground/[0.07]" : "bg-foreground/[0.05]",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[10px] font-sans-medium capitalize",
                        status === "full" ? "text-salli-accent" : "text-foreground/40",
                      )}
                    >
                      {status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View className="flex-row justify-between py-2.5">
            <Text className="font-sans-semibold text-[12px] text-foreground/45">Gross Tax</Text>
            <Text className="font-sans-bold text-[14px] text-foreground">Rs. {formatLKR(data.tax_before_credits, 0)}</Text>
          </View>
        </View>
      </Card>

      <PillButton variant="secondary" className="mt-3" loading={compute.isPending} onPress={() => compute.mutate()}>
        Recompute
      </PillButton>

      <Disclaimer text="Deterministic engine · Planning estimate only · Not financial advice" />
    </View>
  );
}

type CreditRow = {
  key: string;
  Icon: typeof CreditCard;
  title: string;
  subtitle: string;
  amount: number;
  activeLabel: string;
};

function DeductionsTab({ data }: { data: TaxComputationFull }) {
  const colors = useThemeColors();
  const relief = Number(data.personal_relief_applied);
  const apit = Number(data.apit_credit);
  const ait = Number(data.ait_credit);
  const ftc = Number(data.foreign_tax_credit);
  const totalCredits = apit + ait + ftc;
  const total = relief + totalCredits;

  const credits: CreditRow[] = [
    {
      key: "apit",
      Icon: CreditCard,
      title: "APIT · Employer Withholding",
      subtitle: apit > 0 ? "Advance income tax on salary" : "No APIT withheld",
      amount: apit,
      activeLabel: "Applied",
    },
    {
      key: "ait",
      Icon: Landmark,
      title: "AIT · Bank Interest Tax",
      subtitle: ait > 0 ? "Advance income tax on interest" : "No qualifying interest income",
      amount: ait,
      activeLabel: "Applied",
    },
    {
      key: "ftc",
      Icon: Percent,
      title: "FTC · Foreign Tax Credit",
      subtitle: ftc > 0 ? "Tax paid to a foreign authority" : "No foreign-taxed income",
      amount: ftc,
      activeLabel: "Applied",
    },
  ];

  return (
    <View className="pt-3">
      <View className="px-4">
        <Card className="bg-salli-navy-card p-[18px]">
          <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
            Total Deductions &amp; Credits
          </Text>
          <View className="mb-1 flex-row items-baseline gap-1">
            <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
            <Text className="font-sans-extrabold text-[44px] tracking-tighter text-white">{formatLKR(total, 0)}</Text>
          </View>
          <Text className="mb-3.5 text-[11px] text-white/30">Reduces taxable income &amp; tax due</Text>
          <View className="flex-row gap-1.5">
            <StatTile onDark className="flex-1" label="Relief (from income)" value={`Rs. ${formatLKRAbbrev(relief)}`} />
            <StatTile
              onDark
              className="flex-1"
              label="Credits (from tax)"
              valueClassName="text-salli-accent"
              value={`Rs. ${formatLKRAbbrev(totalCredits)}`}
            />
          </View>
        </Card>
      </View>

      <Text className="px-[18px] pb-1.5 pt-3.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
        Personal Relief
      </Text>
      <View className="px-4">
        <Card className="flex-row items-center gap-2.5 p-3.5">
          <View className="h-10 w-[3px] rounded-pill bg-salli-accent" />
          <View className="h-9 w-9 items-center justify-center rounded-[10px] border border-salli-accent/15 bg-salli-accent/10">
            <User size={15} color={colors.accent} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="font-sans-semibold text-[13px] text-foreground">Statutory Personal Relief</Text>
            <Text className="mt-0.5 text-[11px] text-foreground/30">Auto-applied · AY {data.pack_year}</Text>
          </View>
          <View className="items-end">
            <Text className="font-sans-bold text-[13px] text-foreground">Rs. {formatLKRAbbrev(relief)}</Text>
            <View className="mt-0.5 rounded-[4px] bg-salli-accent/15 px-1.5 py-px">
              <Text className="text-[10px] font-sans-medium text-salli-accent">Active</Text>
            </View>
          </View>
        </Card>
      </View>

      <Text className="px-[18px] pb-1.5 pt-3.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
        Tax Credits
      </Text>
      <View className="gap-1.5 px-4">
        {credits.map((c) => {
          const active = c.amount > 0;
          return (
            <Card key={c.key} className={cn("flex-row items-center gap-2.5 p-3.5", !active && "opacity-50")}>
              <View className={cn("h-10 w-[3px] rounded-pill", active ? "bg-salli-accent" : "bg-foreground/10")} />
              <View
                className={cn(
                  "h-9 w-9 items-center justify-center rounded-[10px]",
                  active ? "border border-salli-accent/15 bg-salli-accent/10" : "bg-foreground/[0.05]",
                )}
              >
                <c.Icon size={15} color={active ? colors.accent : "rgba(148,163,184,0.7)"} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text className={cn("font-sans-semibold text-[13px]", active ? "text-foreground" : "text-foreground/50")}>
                  {c.title}
                </Text>
                <Text className="mt-0.5 text-[11px] text-foreground/30">{c.subtitle}</Text>
              </View>
              <View className="items-end">
                <Text className={cn("font-sans-bold text-[13px]", active ? "text-foreground" : "text-foreground/25")}>
                  {active ? `−Rs. ${formatLKRAbbrev(c.amount)}` : "—"}
                </Text>
                <View className={cn("mt-0.5 rounded-[4px] px-1.5 py-px", active ? "bg-salli-accent/15" : "bg-foreground/[0.05]")}>
                  <Text className={cn("text-[10px] font-sans-medium", active ? "text-salli-accent" : "text-foreground/25")}>
                    {active ? c.activeLabel : "Inactive"}
                  </Text>
                </View>
              </View>
            </Card>
          );
        })}
      </View>

      <View className="px-4">
        <Disclaimer text="Credits reduce tax payable directly; relief reduces taxable income first." />
      </View>
    </View>
  );
}

function HistoryTab({ colors }: { colors: ReturnType<typeof useThemeColors> }) {
  const history = useTaxHistory();

  const rows = useMemo(
    () => (history.data ?? []).filter((r) => r.result != null) as { pack: TaxPack; result: TaxComputationFull }[],
    [history.data],
  );

  const total = rows.reduce((sum, r) => sum + Number(r.result.tax_payable), 0);
  const maxTax = Math.max(1, ...rows.map((r) => Number(r.result.tax_payable)));
  // Ordered oldest→newest for the bar chart.
  const chartRows = [...rows].reverse();

  const yoy = useMemo(() => {
    if (chartRows.length < 2) return null;
    const prev = Number(chartRows[chartRows.length - 2].result.tax_payable);
    const curr = Number(chartRows[chartRows.length - 1].result.tax_payable);
    if (!(prev > 0)) return null;
    return (curr - prev) / prev;
  }, [chartRows]);

  if (rows.length === 0) {
    return (
      <View className="items-center gap-2 px-8 pt-12">
        <Text className="text-center font-sans-semibold text-[15px] text-foreground">No assessment years yet</Text>
        <Text className="text-center text-[13px] leading-5 text-foreground/40">
          Once you compute tax for a year of assessment, it appears here.
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 pt-3">
      <Card className="bg-salli-navy-card p-[18px]">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Tax {rows.length > 1 ? `· ${rows.length}-Year Total` : "· Estimated"}
            </Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[40px] tracking-tighter text-white">{formatLKR(total, 0)}</Text>
            </View>
          </View>
          {yoy != null && (
            <View className="mt-1 rounded-[8px] border border-salli-accent/30 bg-salli-accent/20 px-2.5 py-1">
              <Text className="font-sans-semibold text-[11px] text-salli-accent">
                {yoy >= 0 ? "↑" : "↓"} {formatPct(Math.abs(yoy), 0)} YoY
              </Text>
            </View>
          )}
        </View>

        {chartRows.length >= 2 && (
        <View className="mt-3.5 h-[70px] flex-row items-end gap-3.5 px-1">
          {chartRows.map((r, i) => {
            const isLast = i === chartRows.length - 1;
            const h = Math.max(8, (Number(r.result.tax_payable) / maxTax) * 60);
            return (
              <View key={r.pack.year} className="flex-1 items-center gap-1.5">
                <View
                  style={{ height: h }}
                  className={cn("w-full rounded-t-[6px]", isLast ? "bg-salli-accent" : "bg-white/15")}
                />
                <Text className={cn("text-[10px]", isLast ? "font-sans-semibold text-white" : "text-white/30")}>
                  {r.pack.year.replace("20", "")}
                </Text>
              </View>
            );
          })}
        </View>
        )}
      </Card>

      <Text className="px-1.5 pb-1.5 pt-3.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
        Assessment Years
      </Text>
      <View className="gap-1.5">
        {rows.map((r, i) => {
          const isCurrent = i === 0;
          return (
            <Card
              key={r.pack.year}
              className={cn("flex-row items-center gap-2.5 p-3.5", isCurrent && "border-salli-accent/25")}
            >
              <View className={cn("h-11 w-[3px] rounded-pill", isCurrent ? "bg-salli-accent" : "bg-foreground/15")} />
              <View className="flex-1">
                <View className="mb-0.5 flex-row items-center gap-1.5">
                  <Text className="font-sans-semibold text-[13px] text-foreground">AY {r.pack.year}</Text>
                  <View className={cn("rounded-[4px] px-1.5 py-px", isCurrent ? "bg-salli-accent/15" : "bg-foreground/[0.07]")}>
                    <Text className={cn("text-[9px] font-sans-semibold", isCurrent ? "text-salli-accent" : "text-foreground/45")}>
                      {isCurrent ? "CURRENT" : "COMPUTED"}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] text-foreground/30">
                  Est. · {dueDateLabel(r.pack, r.pack.year)} · Eff. {formatPct(effRate(r.result), 2)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-sans-bold text-[14px] text-foreground">Rs. {formatLKRAbbrev(r.result.tax_payable)}</Text>
                <Text className="mt-0.5 text-[10px] text-foreground/25">Not filed</Text>
              </View>
            </Card>
          );
        })}
      </View>

    </View>
  );
}
