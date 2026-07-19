import { Bell, Download } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { StatTile } from "@/components/ui/stat-tile";
import { useComputeTax, useLatestTax } from "@/hooks/useTax";
import { formatLKR, formatLKRAbbrev } from "@/lib/format";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const YEARS = ["2024/25", "2025/26"];

export default function TaxScreen() {
  const colors = useThemeColors();
  const [year, setYear] = useState("2025/26");
  const tax = useLatestTax(year);
  const compute = useComputeTax(year);

  return (
    <PageShell>
      <View className="flex-row items-center gap-3 px-5 pt-2.5">
        <View className="flex-1">
          <ScreenHeader title="Tax" back />
        </View>
        <View className="mr-5 flex-row rounded-pill border border-foreground/[0.08] bg-card p-1">
          {YEARS.map((y) => (
            <Pressable key={y} onPress={() => setYear(y)} className={cn("rounded-pill px-3 py-1", year === y && "bg-primary")}>
              <Text className={cn("text-[11px]", year === y ? "font-sans-semibold text-primary-foreground" : "font-sans-medium text-foreground/40")}>
                {y.replace("20", "")}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!tax.data ? (
        <View className="items-center gap-3 px-8 pt-10">
          <Text className="text-center font-sans-semibold text-[16px] text-foreground">
            Compute your tax
          </Text>
          <Text className="text-center text-[13px] leading-5 text-foreground/40">
            Deterministic rules engine · not AI · planning estimate only.
          </Text>
          <PillButton className="mt-2" loading={compute.isPending} onPress={() => compute.mutate()}>
            Compute Tax
          </PillButton>
        </View>
      ) : (
        <View className="px-4 pt-3">
          <Card className="bg-salli-navy-card p-[18px]">
            <Text className="mb-2 text-[11px] font-sans-medium uppercase tracking-wide text-white/50">
              Net Tax Payable · AY {tax.data.pack_year}
            </Text>
            <View className="mb-1 flex-row items-baseline gap-1">
              <Text className="font-sans-semibold text-[20px] text-white/40">Rs.</Text>
              <Text className="font-sans-extrabold text-[44px] tracking-tighter text-white">
                {formatLKR(tax.data.tax_payable, 0)}
              </Text>
            </View>
            <Text className="mb-3.5 text-[11px] text-white/30">Pack v{tax.data.pack_version}</Text>
            <View className="flex-row gap-1.5">
              <StatTile onDark className="flex-1" label="Gross Income" value={`Rs. ${formatLKRAbbrev(tax.data.gross_income)}`} />
              <StatTile onDark className="flex-1" label="Taxable" value={`Rs. ${formatLKRAbbrev(tax.data.taxable_income)}`} />
              <StatTile onDark className="flex-1" label="APIT Credit" valueClassName="text-salli-accent" value={`-Rs. ${formatLKRAbbrev(tax.data.apit_credit)}`} />
            </View>
          </Card>

          <View className="mt-2.5 flex-row gap-2">
            <Pressable className="h-[38px] flex-1 flex-row items-center justify-center gap-1.5 rounded-pill border border-foreground/[0.08] bg-card">
              <Download size={13} color={colors.mutedForeground} strokeWidth={2} />
              <Text className="font-sans-medium text-[12px] text-foreground/50">Download PDF</Text>
            </Pressable>
            <Pressable className="h-[38px] flex-1 flex-row items-center justify-center gap-1.5 rounded-pill bg-salli-accent">
              <Bell size={13} color="#FFFFFF" strokeWidth={2} />
              <Text className="font-sans-semibold text-[12px] text-white">Set Reminder</Text>
            </Pressable>
          </View>

          <Card className="mt-2.5 overflow-hidden p-0">
            <View className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3">
              <Text className="font-sans-semibold text-[13px] text-foreground">Progressive Tax Bands</Text>
            </View>
            <View className="px-4">
              {tax.data.band_workings.map((band, i) => (
                <View
                  key={i}
                  className={cn(
                    "flex-row items-center gap-2.5 py-2.5",
                    i < tax.data!.band_workings.length - 1 && "border-b border-foreground/[0.05]",
                  )}
                >
                  <View className={cn("h-[34px] w-[3px] rounded-pill", Number(band.taxable_in_band) > 0 ? "bg-salli-accent" : "bg-foreground/10")} />
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[12px] text-foreground">
                      {band.band} · {band.rate}
                    </Text>
                  </View>
                  <Text className="font-sans-semibold text-[12px] text-foreground">
                    {Number(band.tax) > 0 ? `Rs. ${formatLKR(band.tax, 0)}` : "—"}
                  </Text>
                </View>
              ))}
              <View className="flex-row justify-between py-2.5">
                <Text className="font-sans-semibold text-[12px] text-foreground/45">Gross Tax</Text>
                <Text className="font-sans-bold text-[14px] text-foreground">
                  Rs. {formatLKR(tax.data.tax_before_credits, 0)}
                </Text>
              </View>
            </View>
          </Card>

          <Card className="mt-2.5 overflow-hidden p-0">
            <View className="border-b border-foreground/[0.06] px-4 py-3">
              <Text className="font-sans-semibold text-[13px] text-foreground">Credits &amp; Relief</Text>
            </View>
            <View className="px-4">
              <View className="flex-row items-center justify-between border-b border-foreground/[0.05] py-2.5">
                <Text className="text-[12px] text-foreground">Personal Relief</Text>
                <Text className="font-sans-semibold text-[12px] text-foreground/60">
                  −Rs. {formatLKRAbbrev(tax.data.personal_relief_applied)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between border-b border-foreground/[0.05] py-2.5">
                <Text className="text-[12px] text-foreground">APIT Withheld</Text>
                <Text className="font-sans-semibold text-[12px] text-foreground/60">
                  −Rs. {formatLKR(tax.data.apit_credit, 0)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2.5">
                <Text className="font-sans-bold text-[13px] text-foreground">Net Payable</Text>
                <Text className="font-sans-bold text-[16px] text-foreground">Rs. {formatLKR(tax.data.tax_payable, 0)}</Text>
              </View>
            </View>
          </Card>

          <PillButton variant="secondary" className="mt-3" loading={compute.isPending} onPress={() => compute.mutate()}>
            Recompute
          </PillButton>

          <Text className="mt-3 text-center text-[11px] leading-4 text-foreground/25">
            Deterministic engine · Planning estimate only · Not financial advice
          </Text>
        </View>
      )}
    </PageShell>
  );
}
