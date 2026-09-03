import { Bell } from "lucide-react-native";
import { useMemo } from "react";
import { Text, View } from "react-native";

import { TourTarget } from "@/components/tour/TourTarget";
import { ActionButton } from "@/components/ui/action-button";
import { Chip, Hero, Rule, Said, SectionLabel, Strong } from "@/components/ui/blocks";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useReminderMutations } from "@/hooks/useReminders";
import type { BandWorking, TaxComputationFull, TaxPack } from "@/hooks/useTax";
import { useComputeTax, useLatestTax, useTaxHistory, useTaxPacks } from "@/hooks/useTax";
import { formatLKR, formatLKRAbbrev, formatPct } from "@/lib/format";
import { dueDateLabel, filingDueDate } from "@/lib/taxDates";
import { useToast } from "@/lib/toast";

const CURRENT_YEAR = "2025/26";

function effRate(r: TaxComputationFull): number {
  return Number(r.tax_payable) / Number(r.gross_income || 1);
}

/** "AY 25/26" — the header tag. The full "2025/26" does not fit beside a
 *  27px title on a narrow phone, and the century is not in question. */
function shortYear(year: string): string {
  return `AY ${year.replace(/^20/, "").replace("/20", "/")}`;
}

/**
 * The numeric bounds of a band, for the range caption.
 *
 * Reads the numeric fields the server sends, falling back to parsing them out
 * of the display label — `/tax/latest` replays stored rows, and ones written
 * before those fields existed don't carry them. The fallback used to be the
 * only path, which meant any change to that string (the currency prefix, the
 * separator, the dash character) silently broke every band.
 */
function bandBounds(band: BandWorking): { from?: number; to?: number | null } {
  if (band.from_amount !== undefined) {
    return { from: Number(band.from_amount), to: band.to_amount == null ? null : Number(band.to_amount) };
  }
  const nums = (band.band.match(/[\d,]+/g) ?? [])
    .map((n) => Number(n.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));
  return { from: nums[0], to: /balance/i.test(band.band) ? null : nums[1] };
}

/** "0 – 1,000,000" / "2,500,001 and above". Plain numbers: the currency is
 *  stated once in the payable figure above, not on every row. */
function bandRange(band: BandWorking): string {
  const { from, to } = bandBounds(band);
  if (from === undefined || !Number.isFinite(from)) return band.band;
  const f = formatLKR(from, 0);
  if (to == null) return `${f} and above`;
  return `${f} – ${formatLKR(to, 0)}`;
}

export default function TaxScreen() {
  const tax = useLatestTax(CURRENT_YEAR);
  const compute = useComputeTax(CURRENT_YEAR);
  const packs = useTaxPacks();
  const currentPack = packs.data?.find((p) => p.year === CURRENT_YEAR);

  return (
    <PageShell
      header={
        // The TourTarget travels with the header — the onboarding tour measures
        // this element's position on screen, so leaving it behind in the scroll
        // area would spotlight an empty rectangle.
        <TourTarget id="tax-header">
          <ScreenHeader title="Tax" back trailing={<Chip>{shortYear(CURRENT_YEAR)}</Chip>} />
        </TourTarget>
      }
    >
      {!tax.data ? (
        <View className="px-5 pt-2">
          <Hero>We haven&rsquo;t worked out your tax yet.</Hero>
          <Text className="mt-2 text-[16px] leading-[23px] text-muted-foreground">
            It is computed from your ledger by a deterministic rules engine — never estimated by AI —
            and is a planning figure, not a filed return.
          </Text>
          <ActionButton className="mt-5" loading={compute.isPending} onPress={() => compute.mutate()}>
            Compute my tax
          </ActionButton>
        </View>
      ) : (
        <TaxDetail data={tax.data} pack={currentPack} compute={compute} />
      )}
    </PageShell>
  );
}

/**
 * The whole of Tax, in one scroll.
 *
 * This screen used to be three tabs. "Deductions" was three credit figures
 * wrapped in icon-boxes with Applied/Inactive badges — the mockup states the
 * same three as plain rows under a "Credits applied" label, which is what they
 * are. "History" was a bar chart of, typically, one bar, plus a row per year;
 * the rows survive as the last block. Nothing was dropped, and the tab bar and
 * the three dark hero cards behind it were.
 */
function TaxDetail({
  data,
  pack,
  compute,
}: {
  data: TaxComputationFull;
  pack: TaxPack | undefined;
  compute: ReturnType<typeof useComputeTax>;
}) {
  const reminders = useReminderMutations();
  const showToast = useToast();
  const history = useTaxHistory();

  // When withheld tax exceeds the liability the bill is zero and the taxpayer
  // is owed money. Showing only "Rs. 0" hid that entirely.
  const isRefund = Number(data.refund_due ?? 0) > 0;
  const headline = Number(isRefund ? data.refund_due : data.tax_payable);

  const relief = Number(data.personal_relief_applied);
  const credits = [
    { key: "apit", label: "APIT withheld", amount: Number(data.apit_credit) },
    { key: "ait", label: "AIT withheld", amount: Number(data.ait_credit) },
    { key: "ftc", label: "Foreign tax credit", amount: Number(data.foreign_tax_credit) },
    { key: "relief", label: "Personal relief", amount: relief },
  ].filter((c) => c.amount > 0);

  /**
   * The last band that actually took any income — the one the next rupee is
   * taxed at, and the only band worth highlighting. The mockup accents exactly
   * one row; accenting every applied band would make the colour decorative.
   */
  const topAppliedIndex = useMemo(() => {
    let idx = -1;
    data.band_workings.forEach((b, i) => {
      if (Number(b.taxable_in_band) > 0) idx = i;
    });
    return idx;
  }, [data.band_workings]);

  // Prior years only. The current year is the whole screen above.
  const priorYears = useMemo(
    () =>
      (history.data ?? []).filter(
        (r) => r.result != null && r.pack.year !== data.pack_year,
      ) as { pack: TaxPack; result: TaxComputationFull }[],
    [history.data, data.pack_year],
  );

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

  return (
    <View>
      {/* The one ink-filled block in the app's vocabulary, used here because
          this figure is the screen's whole reason to exist. */}
      <View className="px-5">
        <Card className="bg-salli-hero px-[18px] py-5">
          <Text className="font-mono text-[10.5px] uppercase tracking-widest text-white/60">
            {isRefund ? "Refund due" : "Payable"}
          </Text>
          <Text
            style={{ letterSpacing: -1.8 }}
            className="mt-1.5 font-sans-extrabold text-[40px] leading-[46px] text-white"
          >
            Rs. {formatLKRAbbrev(headline)}
          </Text>
          <Text className="mt-2 text-[15px] text-white/70">
            {isRefund ? "Owed back to you" : dueDateLabel(pack, data.pack_year)}
          </Text>
        </Card>
      </View>

      <View className="mt-4 px-5">
        <Said>Computed by the tax engine, never estimated by AI.</Said>
      </View>

      <Rule />

      <SectionLabel>
        Bands · {pack ? `${pack.country} ${pack.year} v${pack.version}` : `AY ${data.pack_year}`}
      </SectionLabel>
      <View className="mt-3 gap-[9px] px-5">
        {data.band_workings.map((band, i) => {
          const taxable = Number(band.taxable_in_band);
          const used = taxable > 0;
          const isTop = i === topAppliedIndex;
          return (
            <Card
              key={i}
              flat
              className={`flex-row items-center gap-[11px] px-3.5 py-3 ${
                isTop ? "border-salli-accent" : used ? "" : "border-foreground/25"
              }`}
            >
              <Chip tone={isTop ? "accent" : "plain"} className="min-w-[52px]">
                {band.rate}
              </Chip>
              <Text
                numberOfLines={1}
                className={`min-w-0 flex-1 text-[13.5px] ${
                  used ? "text-muted-foreground" : "text-muted-foreground/60"
                }`}
              >
                {bandRange(band)}
              </Text>
              <Text
                className={`shrink-0 font-sans-extrabold text-[15px] ${
                  used ? "text-foreground" : "text-muted-foreground/60"
                }`}
              >
                {used ? formatLKRAbbrev(band.tax) : "—"}
              </Text>
            </Card>
          );
        })}
      </View>

      {/* Foreign service income is taxed at a flat rate outside the bands, so a
          user with any would otherwise see a headline the bands cannot add up
          to. */}
      {Number(data.foreign_service_income) > 0 ? (
        <View className="mt-3 px-5">
          <Text className="text-[13.5px] leading-5 text-muted-foreground">
            Plus Rs. {formatLKRAbbrev(data.fsi_tax)} on Rs.{" "}
            {formatLKRAbbrev(data.foreign_service_income)} of foreign service income, taxed at a flat
            rate outside these bands.
          </Text>
        </View>
      ) : null}

      <Rule />

      <SectionLabel>{credits.length > 0 ? "Credits applied" : "Credits"}</SectionLabel>
      <View className="mt-3 gap-2.5 px-5">
        {credits.length > 0 ? (
          credits.map((c) => (
            <View key={c.key} className="flex-row items-baseline justify-between gap-3">
              <Text className="min-w-0 flex-1 text-[16px] text-foreground">{c.label}</Text>
              <Text className="shrink-0 font-sans-extrabold text-[16px] text-foreground">
                Rs. {formatLKRAbbrev(c.amount)}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-[15px] leading-[21px] text-muted-foreground">
            Nothing withheld against this year yet.
          </Text>
        )}
      </View>

      <Rule />

      <View className="px-5">
        <Said>
          <Strong>Rs. {formatLKRAbbrev(data.tax_before_credits)}</Strong> gross tax at an effective
          rate of <Strong>{formatPct(effRate(data), 2)}</Strong>.
        </Said>
      </View>

      {priorYears.length > 0 ? (
        <>
          <Rule />
          <SectionLabel>Earlier years</SectionLabel>
          <View className="mt-3 gap-[9px] px-5">
            {priorYears.map((r) => (
              <Card key={r.pack.year} flat className="flex-row items-center gap-3 px-3.5 py-3">
                <Chip className="min-w-[62px]">{shortYear(r.pack.year)}</Chip>
                <Text className="min-w-0 flex-1 text-[13.5px] text-muted-foreground">
                  Eff. {formatPct(effRate(r.result), 2)} · not filed
                </Text>
                <Text className="shrink-0 font-sans-extrabold text-[15px] text-foreground">
                  {formatLKRAbbrev(r.result.tax_payable)}
                </Text>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <Rule />

      <View className="gap-2.5 px-5">
        <ActionButton
          variant="accent"
          loading={reminders.create.isPending}
          onPress={handleSetReminder}
        >
          <View className="flex-row items-center gap-2">
            <Bell size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text className="font-sans-bold text-[17px] text-white">Set filing reminder</Text>
          </View>
        </ActionButton>
        <ActionButton variant="secondary" loading={compute.isPending} onPress={() => compute.mutate()}>
          Recompute
        </ActionButton>
        <Text className="mt-1 text-[13.5px] leading-5 text-muted-foreground">
          A planning estimate, not a filed return. Credits reduce tax directly; relief reduces
          taxable income first.
        </Text>
      </View>
      <View className="h-7" />
    </View>
  );
}
