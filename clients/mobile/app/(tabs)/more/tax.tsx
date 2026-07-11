import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { RefreshCw, Globe, AlertTriangle, Percent } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { BentoTile } from "@/components/ui/bento-tile";
import { PillButton } from "@/components/ui/pill-button";
import { useTax, type TaxResult } from "@/hooks/useTax";
import { useThemeColors } from "@/lib/theme";

const MONO_MEDIUM = { fontFamily: "IBMPlexMono_500Medium" };
const MONO_REGULAR = { fontFamily: "IBMPlexMono_400Regular" };

function parse(s: string) {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

export default function TaxScreen() {
  const theme = useThemeColors();
  const { latest, compute } = useTax();
  const [result, setResult] = useState<TaxResult | undefined>(undefined);
  const displayResult = result ?? compute.data ?? latest.data ?? null;

  const hasFsi = !!displayResult && parse(displayResult.foreign_service_income) > 0;

  async function handleCompute() {
    const r = await compute.mutateAsync(undefined);
    setResult(r);
  }

  const effectiveRate = displayResult
    ? ((parse(displayResult.tax_payable) / parse(displayResult.gross_income)) * 100).toFixed(1)
    : null;

  if (latest.isLoading) {
    return (
      <ScreenShell edges={["left", "right"]}>
        <View className="items-center justify-center py-24">
          <ActivityIndicator color={theme.foreground} />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <Text className="text-muted-foreground text-[12px] mb-5 font-medium">
        Sri Lanka individual income tax · Assessment Year 2025/26 · IRD
      </Text>

      {/* Empty state */}
      {!displayResult && (
        <View className="items-center py-10">
          <View className="w-20 h-20 rounded-[24px] items-center justify-center mb-6" style={{ backgroundColor: "#E8FC85" }}>
            <Percent color="#010001" size={32} strokeWidth={2} />
          </View>
          <Text
            className="text-foreground text-center mb-2"
            style={{ fontFamily: "DMSans_900Black", fontSize: 22, letterSpacing: -0.5 }}
          >
            Compute your tax
          </Text>
          <Text className="text-muted-foreground text-[13.5px] text-center leading-[20px] mb-4 px-2">
            Salli&apos;s deterministic rules engine — not the AI — computes your liability from your
            ledger data.
          </Text>
          <View className="bg-amber-50 border border-amber-200 rounded-[14px] px-4 py-3.5 mb-6 w-full">
            <Text className="text-[12.5px] text-amber-800 leading-[18px]">
              Planning estimate only. Consult a registered tax agent before filing with the IRD.
            </Text>
          </View>
          <PillButton variant="primary" onPress={handleCompute} loading={compute.isPending} className="px-8">
            {compute.isPending ? "Computing…" : "Compute Tax"}
          </PillButton>
          {compute.error && (
            <Text className="text-[12px] text-destructive mt-3 text-center">{String(compute.error)}</Text>
          )}
        </View>
      )}

      {/* Computed result */}
      {displayResult && (
        <View className="gap-3">
          <View className="flex-row justify-end">
            <PillButton variant="secondary" onPress={handleCompute} loading={compute.isPending}>
              {compute.isPending ? "Recomputing…" : "Recompute"}
            </PillButton>
          </View>

          {/* Metric tiles: 2x2 grid */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <BentoTile
                variant="mint"
                label="Gross Income"
                sub={hasFsi ? "Employment + FSI + Other" : "Employment + Other"}
                value={displayResult.gross_income}
                badge={displayResult.currency}
              />
            </View>
            <View className="flex-1">
              <BentoTile
                variant="teal"
                label="Personal Relief"
                sub="Statutory deduction"
                value={`(${displayResult.personal_relief})`}
                badge={`${displayResult.currency} deducted`}
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <BentoTile
                variant="card"
                label="Taxable Income"
                sub="After all reliefs"
                value={displayResult.taxable_income}
                badge={displayResult.currency}
              />
            </View>
            <View className="flex-1">
              <BentoTile
                variant="lime"
                label="Tax Payable"
                sub="Net · due Sep 30, 2026"
                value={displayResult.tax_payable}
                badge={effectiveRate ? `${effectiveRate}% effective rate` : undefined}
              />
            </View>
          </View>

          {/* Computation workings */}
          <CardContainer>
            <SectionTitle>Computation</SectionTitle>
            <View>
              {hasFsi && (
                <>
                  <Row label="Regular Income" value={displayResult.regular_income} />
                  <Row label="Foreign Service Income" value={displayResult.foreign_service_income} />
                </>
              )}
              <Row label="Gross Income" value={displayResult.gross_income} strong thick />
              <Row label="Less: Personal Relief" value={`(${displayResult.personal_relief})`} green />
              <Row label="Taxable Income" value={displayResult.taxable_income} strong />
              <Row label="Tax on progressive bands" value={displayResult.total_tax} />
              {parse(displayResult.credits.apit) > 0 && (
                <Row label="Less: APIT Credit" value={`(${displayResult.credits.apit})`} green />
              )}
              {parse(displayResult.credits.ait) > 0 && (
                <Row label="Less: AIT Credit" value={`(${displayResult.credits.ait})`} green />
              )}
              {parse(displayResult.credits.ftc) > 0 && (
                <Row label="Less: FTC" value={`(${displayResult.credits.ftc})`} green />
              )}
            </View>
            <View
              className="flex-row justify-between items-center px-[18px] py-3.5 rounded-[14px] mt-3"
              style={{ backgroundColor: "#E8FC85" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#010001" }}>Net Tax Payable</Text>
              <Text style={[MONO_MEDIUM, { fontSize: 14, fontWeight: "900", color: "#010001" }]}>
                {displayResult.tax_payable} {displayResult.currency}
              </Text>
            </View>
          </CardContainer>

          {/* Credits Applied — dark card */}
          <View className="rounded-card p-5" style={{ backgroundColor: "#010001" }}>
            <Text className="mb-4" style={{ fontFamily: "DMSans_700Bold", fontSize: 14, color: "#FFFFFF" }}>
              Credits Applied
            </Text>
            <View className="gap-2.5">
              <CreditItem
                label="APIT"
                sub="Advance Personal Income Tax withheld by employer"
                value={displayResult.credits.apit}
                active={parse(displayResult.credits.apit) > 0}
              />
              <CreditItem
                label="AIT"
                sub="Advance Income Tax on interest income"
                value={displayResult.credits.ait}
                active={parse(displayResult.credits.ait) > 0}
              />
              <CreditItem
                label="FTC"
                sub="Foreign Tax Credit"
                value={displayResult.credits.ftc}
                active={parse(displayResult.credits.ftc) > 0}
              />
            </View>
            <View
              className="flex-row justify-between items-center px-4 py-3.5 rounded-[14px] mt-3"
              style={{ backgroundColor: "#E8FC85" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#010001" }}>Net Payable</Text>
              <Text style={[MONO_MEDIUM, { fontSize: 14, fontWeight: "900", color: "#010001" }]}>
                {displayResult.tax_payable}
              </Text>
            </View>
          </View>

          {/* Progressive Bands table */}
          <CardContainer>
            <SectionTitle>Progressive Bands</SectionTitle>

            {/* Header row */}
            <View className="flex-row px-3 py-1.5">
              <Text className="flex-1 text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
                Band
              </Text>
              <Text className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground w-14 text-right">
                Rate
              </Text>
              <Text className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground w-24 text-right">
                Taxable
              </Text>
              <Text className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground w-20 text-right">
                Tax
              </Text>
            </View>

            {displayResult.bands.map((b, i) => {
              const active = parse(b.taxable_in_band) > 0;
              return (
                <View
                  key={i}
                  className="flex-row items-center px-3 py-2.5 rounded-[10px] mb-1"
                  style={{ backgroundColor: active ? "#D5E9EA" : theme.muted }}
                >
                  <Text
                    className="flex-1 text-[11.5px]"
                    style={{ fontWeight: "700", color: active ? "#010001" : theme.foreground }}
                    numberOfLines={2}
                  >
                    {b.band}
                  </Text>
                  <Text
                    className="w-14 text-right text-[12px]"
                    style={[{ fontWeight: "800", color: active ? "#010001" : theme.mutedForeground }]}
                  >
                    {b.rate}
                  </Text>
                  <Text
                    className="w-24 text-right text-[11px]"
                    style={[MONO_REGULAR, { color: active ? "rgba(0,0,0,0.55)" : theme.mutedForeground }]}
                  >
                    {active ? b.taxable_in_band : "—"}
                  </Text>
                  <Text
                    className="w-20 text-right text-[11px]"
                    style={[MONO_REGULAR, { color: active ? "rgba(0,0,0,0.55)" : theme.mutedForeground }]}
                  >
                    {parse(b.tax) > 0 ? b.tax : "—"}
                  </Text>
                </View>
              );
            })}

            {/* Total row */}
            <View
              className="flex-row justify-between items-center px-3 py-2.5 rounded-[10px] mt-1"
              style={{ backgroundColor: "#E8FC85" }}
            >
              <Text style={{ fontSize: 13, fontWeight: "900", color: "#010001" }}>Total</Text>
              <Text style={[MONO_MEDIUM, { fontSize: 13, fontWeight: "900", color: "#010001" }]}>
                {displayResult.total_tax}
              </Text>
            </View>
          </CardContainer>

          {/* FSI breakdown — only if FSI exists */}
          {hasFsi && (
            <CardContainer>
              <View className="flex-row items-center gap-2 mb-4">
                <Globe color="#3B82F6" size={16} />
                <Text style={{ fontFamily: "DMSans_700Bold", fontSize: 14 }} className="text-foreground">
                  Foreign Service Income Regime
                </Text>
              </View>
              <Text className="text-[11px] text-muted-foreground mb-4 leading-[16px]">
                15% final tax — remitted via a licensed Sri Lankan bank
              </Text>

              <Text className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
                Income Split
              </Text>
              <Row label="Total gross income" value={displayResult.gross_income} />
              <Row label="Regular income (progressive bands)" value={displayResult.regular_income} />
              <Row label="Foreign service income (15% flat)" value={displayResult.foreign_service_income} />

              <Text className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                Tax Computation
              </Text>
              <Row label="FSI tax at 15% flat" value={displayResult.fsi_tax} />
              <Row label="Tax before credits" value={displayResult.total_tax} strong />
            </CardContainer>
          )}

          {/* Disclaimer */}
          <View className="flex-row items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[14px]">
            <AlertTriangle color="#B45309" size={15} style={{ marginTop: 1 }} />
            <Text className="flex-1 text-[12.5px] text-amber-800 leading-[18px]">
              Planning estimate only. Numbers from the deterministic rules engine — the AI never
              computes tax. Consult a registered tax agent before filing with the IRD.
            </Text>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  strong = false,
  green = false,
  thick = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  green?: boolean;
  thick?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between items-center py-2.5 ${
        thick ? "border-b-2 border-foreground" : "border-b border-border"
      }`}
    >
      <Text
        className={strong ? "text-foreground flex-1 pr-2" : "text-muted-foreground flex-1 pr-2"}
        style={strong ? { fontFamily: "DMSans_700Bold", fontSize: 13.5 } : { fontSize: 13.5 }}
        numberOfLines={2}
      >
        {label}
      </Text>
      <Text
        style={[MONO_MEDIUM, { fontSize: 13.5, fontWeight: "700", color: green ? "#059669" : undefined }]}
        className={green ? undefined : "text-foreground"}
      >
        {value}
      </Text>
    </View>
  );
}

function CreditItem({
  label,
  sub,
  value,
  active,
}: {
  label: string;
  sub: string;
  value: string;
  active: boolean;
}) {
  return (
    <View
      className="px-4 py-3.5 rounded-[14px]"
      style={{ backgroundColor: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", opacity: active ? 1 : 0.5 }}
    >
      <View className="flex-row justify-between items-start mb-1">
        <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" }}>{label}</Text>
        <Text
          style={[
            MONO_MEDIUM,
            { fontSize: 13.5, fontWeight: "800", color: active ? "#E8FC85" : "rgba(255,255,255,0.35)" },
          ]}
        >
          {active ? `(${value})` : "—"}
        </Text>
      </View>
      <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.38)", lineHeight: 15 }}>{sub}</Text>
    </View>
  );
}
