import { useRouter } from "expo-router";
import {
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LineChart,
  ListChecks,
  Target,
  Trash2,
  User,
  Wallet,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { ModeChoiceStep } from "@/components/onboarding/ModeChoiceStep";
import { FilterChip } from "@/components/ui/filter-chip";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import {
  completeOnboardingOnboardingCompletePost,
  declareGoalsOnboardingGoalsPost,
  declareIncomeOnboardingIncomePost,
  submitRiskQuestionnaireOnboardingRiskQuestionnairePost,
  updateProfileOnboardingProfilePatch,
} from "@/lib/api/sdk.gen";
import { useIsTablet } from "@/lib/responsive";
import type { AppMode } from "@/lib/store";
import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Profile", "Income", "Risk", "Goals", "Review", "Mode"];
const TOTAL_STEPS = STEP_LABELS.length + 1; // +1 for the Welcome step

/** Each step's form column is capped and centered on tablet instead of
 * stretching edge-to-edge, matching AuthShell's narrower form-width pattern
 * (this wizard is single-column fields/choice-cards, not a data grid). */
const TABLET_STEP_MAX_WIDTH = 480;

const WELCOME_ITEMS = [
  { icon: Briefcase, title: "Your profile", detail: "Name, DOB, tax residency, employment" },
  { icon: Wallet, title: "Accounts & balances", detail: "Bank accounts, assets, liabilities" },
  { icon: LineChart, title: "Income sources", detail: "Employment, freelance, rental, other" },
  { icon: ListChecks, title: "Risk profile", detail: "Investment horizon & risk tolerance" },
  { icon: Target, title: "Financial goals", detail: "FIRE, home, emergency fund, debt-free" },
];

const EMPLOYMENT_OPTIONS = ["employed", "self_employed", "student", "retired"] as const;

const EMPLOYMENT_LABELS: Record<(typeof EMPLOYMENT_OPTIONS)[number], string> = {
  employed: "Employed",
  self_employed: "Self-employed",
  student: "Student",
  retired: "Retired",
};

const INCOME_SOURCES = [
  { key: "employment", label: "Employment", hint: "Salary / wages · APIT applies", code: "4100", accountName: "Employment Income" },
  { key: "interest", label: "Interest Income", hint: "Bank deposits · AIT applies", code: "4400", accountName: "Interest Income" },
  { key: "freelance", label: "Freelance / Business", hint: "Self-employed income", code: "4200", accountName: "Freelance / Business Income" },
  { key: "rental", label: "Rental Income", hint: "Property lease", code: "4300", accountName: "Rental Income" },
  { key: "foreign", label: "Foreign Remittances", hint: "FSI · 15% flat regime", code: "4500", accountName: "Foreign Service Income (FSI)" },
  { key: "dividends", label: "Dividends", hint: "Share dividends · WHT applies", code: "4600", accountName: "Dividend Income" },
] as const;

const DRAWDOWN_OPTIONS = [
  { value: "sell_all", label: "Sell everything" },
  { value: "sell_some", label: "Sell some" },
  { value: "hold", label: "Hold and wait" },
  { value: "buy_more", label: "Buy more" },
] as const;
const STABILITY_OPTIONS = [
  { value: "unstable", label: "Unstable" },
  { value: "moderate", label: "Moderate" },
  { value: "stable", label: "Stable" },
] as const;
const EXPERIENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "some", label: "Some" },
  { value: "experienced", label: "Experienced" },
] as const;

const GOAL_KINDS = [
  { value: "financial_independence", label: "Freedom" },
  { value: "retirement", label: "Retirement" },
  { value: "home", label: "Buy a home" },
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "debt_free", label: "Become debt-free" },
  { value: "wealth_growth", label: "Grow wealth" },
] as const;

type GoalDraft = { name: string; kind: string; targetAmount: string; targetYear: string; motivation: string };

function StepHeader({ index, onBack }: { index: number; onBack: () => void }) {
  const colors = useThemeColors();
  return (
    <>
      <View className="flex-row items-center justify-between px-5 pt-2.5">
        <Pressable
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full border border-foreground/[0.08] bg-foreground/[0.07]"
        >
          <ChevronLeft size={16} color={colors.foreground} strokeWidth={2} />
        </Pressable>
        <Text className="font-sans-medium text-[15px] text-muted-foreground">
          {index + 2} of {TOTAL_STEPS}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      {/* bar 0 = Welcome (already done), the rest = the labeled steps.
          Global position of the current labeled step is index+1. */}
      <View className="flex-row gap-1 px-4 pb-1 pt-3">
        {Array.from({ length: TOTAL_STEPS }).map((_, g) => (
          <View
            key={g}
            className={cn(
              "h-[3px] flex-1 rounded-pill",
              g < index + 1 ? "bg-salli-accent opacity-50" : g === index + 1 ? "bg-salli-accent" : "bg-foreground/[0.15]",
            )}
          />
        ))}
      </View>
      <View className="flex-row justify-between px-4">
        {STEP_LABELS.map((label, i) => (
          <Text key={label} className={cn("text-[13px]", i === index ? "font-sans-medium text-salli-accent" : "text-muted-foreground")}>
            {label}
          </Text>
        ))}
      </View>
    </>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="pb-4 pt-4">
      <Text className="mb-1.5 font-sans-extrabold text-[32px] tracking-tight text-foreground">{title}</Text>
      <Text className="text-[15px] text-muted-foreground">{subtitle}</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  // Comfortable top breathing room even on notchless devices / web preview,
  // where the safe-area inset is 0 and content would otherwise hug the edge.
  const topPad = Math.max(insets.top, 24);
  const isTablet = useIsTablet();
  const stepColumnStyle = {
    width: "100%" as const,
    maxWidth: isTablet ? TABLET_STEP_MAX_WIDTH : undefined,
    alignSelf: "center" as const,
  };
  const setOnboardingComplete = useSalliStore((s) => s.setOnboardingComplete);
  const setMode = useSalliStore((s) => s.setMode);
  const setModeChosen = useSalliStore((s) => s.setModeChosen);
  const [step, setStep] = useState(0); // 0 = Welcome, 1..6 = the 6 labeled steps
  const [saving, setSaving] = useState(false);
  const [chosenMode, setChosenMode] = useState<AppMode>("buddy");

  // Step 1 — About You
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [residency, setResidency] = useState<"resident" | "non_resident">("resident");
  const [employment, setEmployment] = useState<(typeof EMPLOYMENT_OPTIONS)[number]>("employed");
  const [irdNumber, setIrdNumber] = useState("");

  // Step 2 — Income
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [incomeAmounts, setIncomeAmounts] = useState<Record<string, string>>({});

  // Step 3 — Risk
  const [timeHorizon, setTimeHorizon] = useState(10);
  const [drawdown, setDrawdown] = useState<(typeof DRAWDOWN_OPTIONS)[number]["value"]>("hold");
  const [stability, setStability] = useState<(typeof STABILITY_OPTIONS)[number]["value"]>("moderate");
  const [experience, setExperience] = useState<(typeof EXPERIENCE_OPTIONS)[number]["value"]>("some");
  const [riskResult, setRiskResult] = useState<{ score: number; category: string } | null>(null);

  // Step 4 — Goals
  const [goals, setGoals] = useState<GoalDraft[]>([
    { name: "", kind: "financial_independence", targetAmount: "", targetYear: "", motivation: "" },
  ]);

  // Live risk category — the engine (not the client) computes the score, so we
  // ask the backend whenever the answers change while on the Risk step.
  useEffect(() => {
    if (step !== 3) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { data } = await submitRiskQuestionnaireOnboardingRiskQuestionnairePost({
          body: {
            time_horizon_years: timeHorizon,
            drawdown_reaction: drawdown,
            income_stability: stability,
            investment_experience: experience,
          },
        });
        if (!cancelled) setRiskResult(data as unknown as { score: number; category: string });
      } catch {
        // leave the previous result in place on transient errors
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, timeHorizon, drawdown, stability, experience]);

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleAboutYouContinue = async () => {
    setSaving(true);
    try {
      await updateProfileOnboardingProfilePatch({
        body: {
          display_name: fullName,
          date_of_birth: dateOfBirth || null,
          residency_status: residency,
          employment_status: employment,
          ird_number: irdNumber || null,
        },
      });
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  const handleIncomeContinue = async () => {
    setSaving(true);
    try {
      const incomes = INCOME_SOURCES.filter((s) => selectedSources.has(s.key)).map((s) => ({
        code: s.code,
        name: s.accountName,
        amount: Number(incomeAmounts[s.key] || 0),
      }));
      if (incomes.length > 0) {
        await declareIncomeOnboardingIncomePost({ body: { incomes } });
      }
      setStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handleRiskContinue = async () => {
    setSaving(true);
    try {
      const { data } = await submitRiskQuestionnaireOnboardingRiskQuestionnairePost({
        body: {
          time_horizon_years: timeHorizon,
          drawdown_reaction: drawdown,
          income_stability: stability,
          investment_experience: experience,
        },
      });
      setRiskResult(data as unknown as { score: number; category: string });
      setStep(4);
    } finally {
      setSaving(false);
    }
  };

  const handleGoalsContinue = async () => {
    setSaving(true);
    try {
      const validGoals = goals.filter((g) => g.name.trim());
      if (validGoals.length > 0) {
        await declareGoalsOnboardingGoalsPost({
          body: {
            goals: validGoals.map((g) => ({
              name: g.name,
              kind: g.kind,
              target_amount: Number(g.targetAmount || 0),
              target_date: g.targetYear ? `${g.targetYear}-01-01` : null,
            })),
          },
        });
      }
      setStep(5);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await completeOnboardingOnboardingCompletePost({
        body: {
          name: fullName,
          residency,
          employment_type: employment,
          ird_number: irdNumber,
          income_sources: Array.from(selectedSources),
          primary_goal: goals[0]?.kind || "",
          goal_target_amount: Number(goals[0]?.targetAmount || 0),
          goal_target_year: goals[0]?.targetYear || "",
          risk_appetite: riskResult?.category || "",
          motivation: goals[0]?.motivation || "",
        },
      });
      setOnboardingComplete(true);
      setMode(chosenMode);
      setModeChosen();
      router.replace(chosenMode === "buddy" ? "/(buddy)" : "/(tabs)");
    } finally {
      setSaving(false);
    }
  };

  // ── Step 0: Welcome ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
        <View className="flex-1 px-6 pt-4" style={[{ paddingBottom: insets.bottom + 16 }, stepColumnStyle]}>
          <View className="mb-5 items-center">
            <Logo size={36} className="text-foreground" />
            <Text className="mb-1.5 mt-3 text-center font-sans-bold text-[30px] tracking-tight text-foreground">
              Welcome to Salli
            </Text>
            <Text className="text-center text-[15px] leading-5 text-muted-foreground">
              Your AI-powered financial companion,{"\n"}built for Sri Lanka.
            </Text>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <Text className="mb-3 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
              We&apos;ll set up together in ~5 min
            </Text>
            <View className="gap-1.5">
              {WELCOME_ITEMS.map((item, i) => (
                <View key={item.title} className="flex-row items-center gap-3 rounded-card border-2 border-foreground bg-card px-4 py-3">
                  <View className={cn("h-8 w-8 items-center justify-center rounded-card", i === 0 ? "bg-salli-accent" : "bg-foreground/[0.08]")}>
                    <item.icon size={16} color={i === 0 ? "#FFFFFF" : colors.mutedForeground} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[15px] text-foreground">{item.title}</Text>
                    <Text className="text-[14px] text-muted-foreground">{item.detail}</Text>
                  </View>
                  <ChevronRight size={14} color={colors.mutedForeground} strokeWidth={2} />
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="pt-3">
            <ActionButton onPress={() => setStep(1)}>
              <Text className="font-sans-bold text-[17px] text-primary-foreground">Begin setup</Text>
              <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
            </ActionButton>
            <View className="mt-2 flex-row justify-center gap-3">
              <Text className="text-[14px] text-muted-foreground">IRD-ready</Text>
              <Text className="text-[14px] text-muted-foreground">·</Text>
              <Text className="text-[14px] text-muted-foreground">100% private</Text>
              <Text className="text-[14px] text-muted-foreground">·</Text>
              <Text className="text-[14px] text-muted-foreground">~5 minutes</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Step 1: About You ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHeader index={0} onBack={() => setStep(0)} />
          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={stepColumnStyle}>
            <StepTitle title="About You" subtitle="Used to compute your IRD tax and FIRE plan." />
            <View className="gap-2">
              <TextField label="Full Name *" active value={fullName} onChangeText={setFullName} placeholder="Your full name" />
              <TextField
                label="Date of Birth *"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                rightIcon={<Calendar size={17} color={colors.foreground} strokeWidth={2} style={{ opacity: 0.2 }} />}
              />

              <View>
                <Text className="mb-1.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Tax Residency *</Text>
                <View className="flex-row rounded-pill border-2 border-foreground bg-card p-1">
                  {(["resident", "non_resident"] as const).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setResidency(value)}
                      className={cn("h-9 flex-1 items-center justify-center rounded-pill", residency === value && "bg-salli-accent")}
                    >
                      <Text className={cn("text-[15px]", residency === value ? "font-sans-semibold text-white" : "font-sans-medium text-muted-foreground")}>
                        {value === "resident" ? "Sri Lankan Resident" : "Non-Resident"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="mb-1.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Employment *</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt}
                      label={EMPLOYMENT_LABELS[opt]}
                      active={employment === opt}
                      onPress={() => setEmployment(opt)}
                    />
                  ))}
                </View>
              </View>

              <TextField
                label="IRD Number"
                optionalHint="optional"
                value={irdNumber}
                onChangeText={setIrdNumber}
                placeholder="Add for accurate tax pre-fill"
                rightIcon={<ChevronRight size={15} color={colors.foreground} strokeWidth={2} style={{ opacity: 0.2 }} />}
              />

              <ActionButton className="mt-1" loading={saving} disabled={!fullName || !dateOfBirth} onPress={handleAboutYouContinue}>
                <Text className="font-sans-semibold text-[17px] text-primary-foreground">Continue to Income</Text>
                <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
              </ActionButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Step 2: Income ───────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHeader index={1} onBack={handleBack} />
          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={stepColumnStyle}>
            <StepTitle title="Income Sources" subtitle="Select all that apply — we map each to a ledger account." />
            <View className="gap-2">
              {INCOME_SOURCES.map((source) => {
                const selected = selectedSources.has(source.key);
                return (
                  <Pressable
                    key={source.key}
                    onPress={() =>
                      setSelectedSources((prev) => {
                        const next = new Set(prev);
                        if (next.has(source.key)) next.delete(source.key);
                        else next.add(source.key);
                        return next;
                      })
                    }
                    className={cn("rounded-card border p-3.5", selected ? "border-salli-accent bg-card" : "border-foreground/[0.08] bg-card")}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className={cn(
                          "h-[22px] w-[22px] items-center justify-center rounded-badge border",
                          selected ? "border-salli-accent bg-salli-accent" : "border-foreground/20",
                        )}
                      >
                        {selected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="font-sans-semibold text-[15px] text-foreground">{source.label}</Text>
                        <Text numberOfLines={1} className="text-[14px] text-muted-foreground">{source.hint}</Text>
                      </View>
                      {selected ? (
                        <View className="flex-none flex-row items-center gap-1 rounded-card border border-foreground/10 bg-muted px-2.5 py-1.5">
                          <Text className="text-[15px] font-sans-medium text-muted-foreground">Rs.</Text>
                          <TextInput
                            value={incomeAmounts[source.key] ?? ""}
                            onChangeText={(v) => setIncomeAmounts((prev) => ({ ...prev, [source.key]: v }))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="rgba(128,128,128,0.4)"
                            style={{ width: 44 }}
                            className="text-right font-sans-semibold text-[15px] text-foreground"
                          />
                          <Text className="text-[14px] text-muted-foreground">/mo</Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}

              <ActionButton className="mt-1" loading={saving} disabled={selectedSources.size === 0} onPress={handleIncomeContinue}>
                <Text className="font-sans-semibold text-[17px] text-primary-foreground">Continue to Risk</Text>
                <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
              </ActionButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Step 3: Risk ─────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHeader index={2} onBack={handleBack} />
          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={stepColumnStyle}>
            <StepTitle title="Risk Profile" subtitle="Shapes your FIRE strategy's asset allocation." />
            <View className="gap-3.5">
              <View>
                <Text className="mb-1.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Time horizon: {timeHorizon} years
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {[3, 5, 10, 15, 20, 30].map((y) => (
                    <FilterChip key={y} label={`${y}y`} active={timeHorizon === y} onPress={() => setTimeHorizon(y)} />
                  ))}
                </View>
              </View>

              <View>
                <Text className="mb-2 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  If markets drop 20%, I would
                </Text>
                <View className="gap-1.5">
                  {DRAWDOWN_OPTIONS.map((o) => {
                    const active = drawdown === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() => setDrawdown(o.value)}
                        className={cn(
                          "flex-row items-center gap-2.5 rounded-card border px-3.5 py-[11px]",
                          active ? "border-salli-accent bg-card" : "border-foreground/[0.08] bg-card",
                        )}
                      >
                        <View
                          className={cn(
                            "h-[18px] w-[18px] items-center justify-center rounded-full border-2",
                            active ? "border-salli-accent" : "border-foreground/20",
                          )}
                        >
                          {active ? <View className="h-2 w-2 rounded-full bg-salli-accent" /> : null}
                        </View>
                        <Text className={cn("text-[15px]", active ? "font-sans-semibold text-foreground" : "font-sans-medium text-foreground/60")}>
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className="mb-1.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Income stability</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {STABILITY_OPTIONS.map((o) => (
                    <FilterChip
                      key={o.value}
                      label={o.label}
                      active={stability === o.value}
                      onPress={() => setStability(o.value)}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text className="mb-1.5 pl-0.5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Investment experience</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <FilterChip
                      key={o.value}
                      label={o.label}
                      active={experience === o.value}
                      onPress={() => setExperience(o.value)}
                    />
                  ))}
                </View>
              </View>

              {riskResult ? (
                <View className="flex-row items-center justify-between rounded-card border border-salli-accent/20 bg-salli-accent/[0.08] px-4 py-3.5">
                  <View>
                    <Text className="mb-0.5 text-[14px] text-muted-foreground">Your risk category</Text>
                    <Text className="font-sans-bold text-[17px] capitalize text-foreground">{riskResult.category}</Text>
                  </View>
                  <View className="rounded-card border border-salli-accent/30 bg-salli-accent/20 px-3 py-1.5">
                    <Text className="text-[15px] font-sans-semibold text-salli-accent">Score {riskResult.score}/100</Text>
                  </View>
                </View>
              ) : null}

              <ActionButton className="mt-1" loading={saving} onPress={handleRiskContinue}>
                <Text className="font-sans-semibold text-[17px] text-primary-foreground">Continue to Goals</Text>
                <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
              </ActionButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Step 4: Goals ────────────────────────────────────────────────────────
  if (step === 4) {
    const updateGoal = (i: number, patch: Partial<GoalDraft>) =>
      setGoals((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));

    return (
      <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StepHeader index={3} onBack={handleBack} />
          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled" contentContainerStyle={stepColumnStyle}>
            <StepTitle title="Financial Goals" subtitle="What are you working toward?" />
            <View className="gap-3">
              {goals.map((goal, i) => (
                <View key={i} className="gap-2 rounded-card border-2 border-foreground bg-card p-3.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans-semibold text-[15px] text-foreground">Goal {i + 1}</Text>
                    {goals.length > 1 ? (
                      <Pressable onPress={() => setGoals((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Trash2 size={16} color={colors.mutedForeground} strokeWidth={2} />
                      </Pressable>
                    ) : null}
                  </View>
                  <TextField label="Name" value={goal.name} onChangeText={(v) => updateGoal(i, { name: v })} placeholder="e.g. Emergency fund" />
                  <View className="flex-row flex-wrap gap-1.5">
                    {GOAL_KINDS.map((k) => (
                      <FilterChip
                        key={k.value}
                        label={k.label}
                        active={goal.kind === k.value}
                        onPress={() => updateGoal(i, { kind: k.value })}
                      />
                    ))}
                  </View>
                  <View className="flex-row gap-2">
                    <TextField
                      label="Target amount"
                      className="flex-1"
                      value={goal.targetAmount}
                      onChangeText={(v) => updateGoal(i, { targetAmount: v })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                    <TextField
                      label="Target year"
                      className="flex-1"
                      value={goal.targetYear}
                      onChangeText={(v) => updateGoal(i, { targetYear: v })}
                      keyboardType="numeric"
                      placeholder="YYYY"
                    />
                  </View>
                  <TextField
                    label="Why this matters"
                    optionalHint="optional"
                    value={goal.motivation}
                    onChangeText={(v) => updateGoal(i, { motivation: v })}
                    placeholder="Your motivation"
                  />
                </View>
              ))}

              <Pressable
                onPress={() => setGoals((prev) => [...prev, { name: "", kind: "financial_independence", targetAmount: "", targetYear: "", motivation: "" }])}
                className="items-center rounded-card border border-dashed border-foreground/15 bg-card py-3"
              >
                <Text className="text-[15px] font-sans-medium text-muted-foreground">+ Add another goal</Text>
              </Pressable>

              <ActionButton className="mt-1" loading={saving} onPress={handleGoalsContinue}>
                <Text className="font-sans-semibold text-[17px] text-primary-foreground">Continue to Review</Text>
                <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
              </ActionButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Step 5: Review ───────────────────────────────────────────────────────
  if (step === 5) {
    const selectedSourceLabels = INCOME_SOURCES.filter((s) => selectedSources.has(s.key)).map((s) => s.label);
    const validGoals = goals.filter((g) => g.name.trim());

    return (
      <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
        <StepHeader index={4} onBack={handleBack} />
        <ScrollView className="flex-1 px-5" contentContainerStyle={stepColumnStyle}>
          <StepTitle title="Review Setup" subtitle="Confirm — we'll post opening balances as ledger entries." />
          <View className="gap-2">
            {(
              [
                {
                  icon: User,
                  title: fullName || "Your profile",
                  subtitle: `${residency === "resident" ? "Resident" : "Non-Resident"} · ${EMPLOYMENT_LABELS[employment]}${dateOfBirth ? ` · ${dateOfBirth}` : ""}`,
                  step: 1,
                },
                {
                  icon: Wallet,
                  title: `${selectedSources.size} income source${selectedSources.size === 1 ? "" : "s"}`,
                  subtitle: selectedSourceLabels.join(", ") || "None declared",
                  step: 2,
                },
                {
                  icon: LineChart,
                  title: `${riskResult?.category ?? "—"} risk · ${validGoals.length} goal${validGoals.length === 1 ? "" : "s"}`,
                  subtitle: validGoals[0]?.name ?? "No goals set",
                  step: 3,
                },
              ] as const
            ).map((row) => (
              <View key={row.step} className="flex-row items-center gap-2.5 rounded-card border-2 border-foreground bg-card p-3.5">
                <View className="h-8 w-8 items-center justify-center rounded-card bg-foreground/[0.06]">
                  <row.icon size={16} color={colors.mutedForeground} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="font-sans-semibold text-[15px] capitalize text-foreground">{row.title}</Text>
                  <Text numberOfLines={1} className="text-[14px] text-muted-foreground">{row.subtitle}</Text>
                </View>
                <Pressable onPress={() => setStep(row.step)}>
                  <Text className="text-[14px] font-sans-medium text-salli-accent">Edit</Text>
                </Pressable>
              </View>
            ))}

            <View className="flex-row items-center gap-2.5 rounded-card border border-salli-accent/20 bg-salli-accent/[0.08] p-3.5">
              <CreditCard size={18} color={colors.accent} strokeWidth={2} />
              <Text className="flex-1 text-[15px] leading-5 text-foreground/60">
                <Text className="font-sans-semibold text-foreground">
                  {selectedSources.size} ledger account{selectedSources.size === 1 ? "" : "s"}
                </Text>{" "}
                will be created with your opening balances.
              </Text>
            </View>

            <ActionButton className="mt-2" onPress={() => setStep(6)}>
              <Text className="font-sans-bold text-[17px] text-primary-foreground">Continue</Text>
              <ChevronRight size={15} color={colors.primaryForeground} strokeWidth={2.5} />
            </ActionButton>
            <Text className="mb-6 mt-2 text-center text-[14px] text-muted-foreground">
              You can change anything later in Settings
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 6: Mode ─────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: topPad }}>
      <StepHeader index={5} onBack={handleBack} />
      <ScrollView className="flex-1 px-5" contentContainerStyle={stepColumnStyle}>
        <StepTitle
          title="How do you want to use Salli?"
          subtitle="Pick a starting point — you can switch anytime with a swipe."
        />
        <ModeChoiceStep
          value={chosenMode}
          onChange={setChosenMode}
          onContinue={handleFinish}
          loading={saving}
          continueLabel="Finish Setup"
        />
      </ScrollView>
    </View>
  );
}
