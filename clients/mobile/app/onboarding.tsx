import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check, Plus, Trash2 } from "lucide-react-native";
import { TextField } from "@/components/ui/text-field";
import { PillButton } from "@/components/ui/pill-button";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/api-fetch";
import { useSalliStore } from "@/lib/store";
import { useThemeColors } from "@/lib/theme";
import {
  updateProfileIdentity,
  declareBalanceSheet,
  declareIncome,
  submitRiskQuestionnaire,
  declareGoals,
  type OpeningBalanceItem,
  type IncomeItem,
  type OnboardingGoalItem,
} from "@/hooks/useOnboardingWizard";

// ── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  display_name: string;
  date_of_birth: string;
  dependents_count: string;
  employment_status: string;
  employment_type: string;
  residency_status: string;
  employer: string;
  ird_number: string;
  balances: OpeningBalanceItem[];
  incomes: IncomeItem[];
  time_horizon_years: string;
  drawdown_reaction: string;
  income_stability: string;
  investment_experience: string;
  goals: OnboardingGoalItem[];
}

const GOAL_KIND_OPTIONS = [
  { id: "financial_independence", label: "Financial independence" },
  { id: "retirement", label: "Comfortable retirement" },
  { id: "home", label: "Buy a home" },
  { id: "emergency_fund", label: "Emergency fund" },
  { id: "debt_free", label: "Become debt-free" },
  { id: "wealth_growth", label: "Grow my wealth" },
  { id: "custom", label: "Something else" },
];

const RESIDENCY_OPTIONS = [
  { id: "resident", label: "Sri Lanka Resident" },
  { id: "non_resident", label: "Non-Resident" },
];

const EMPLOYMENT_STATUS_OPTIONS = ["employed", "self_employed", "unemployed", "student", "retired"];

const DRAWDOWN_OPTIONS = [
  { id: "sell_all", label: "Sell everything" },
  { id: "sell_some", label: "Sell some" },
  { id: "hold", label: "Hold steady" },
  { id: "buy_more", label: "Buy more" },
];

const STABILITY_OPTIONS = [
  { id: "unstable", label: "Unstable" },
  { id: "moderate", label: "Moderate" },
  { id: "stable", label: "Stable" },
];

const EXPERIENCE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "some", label: "Some" },
  { id: "experienced", label: "Experienced" },
];

const STEPS = ["Welcome", "About you", "Opening balances", "Income", "Risk profile", "Goals", "Review"];

const EMPTY_BALANCE: OpeningBalanceItem = { code: "", name: "", type: "asset", amount: 0 };
const EMPTY_INCOME: IncomeItem = { code: "", name: "", amount: 0 };
const EMPTY_GOAL: OnboardingGoalItem = { name: "", kind: "financial_independence", target_amount: 0, current_amount: 0, priority: 2 };

const DEFAULT_DATA: WizardData = {
  display_name: "",
  date_of_birth: "",
  dependents_count: "",
  employment_status: "",
  employment_type: "",
  residency_status: "resident",
  employer: "",
  ird_number: "",
  balances: [{ ...EMPTY_BALANCE }],
  incomes: [{ ...EMPTY_INCOME }],
  time_horizon_years: "",
  drawdown_reaction: "",
  income_stability: "",
  investment_experience: "",
  goals: [{ ...EMPTY_GOAL }],
};

// ── Shared bits ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-foreground text-[12px] mb-1.5" style={{ fontFamily: "DMSans_700Bold" }}>
      {children}
    </Text>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="mb-5">
      <Text className="text-foreground" style={{ fontFamily: "DMSans_700Bold", fontSize: 20, letterSpacing: -0.5 }}>
        {title}
      </Text>
      <Text className="text-muted-foreground text-[13px] mt-1">{subtitle}</Text>
    </View>
  );
}

function Chip({
  selected,
  label,
  onPress,
  className,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        "px-3 py-2.5 rounded-xl border " +
        (selected ? "bg-foreground border-foreground" : "bg-card border-border") +
        (className ? " " + className : "")
      }
    >
      <Text
        className={selected ? "text-background text-[12px]" : "text-foreground text-[12px]"}
        style={{ fontFamily: "DMSans_700Bold" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={"rounded-full " + (i <= current ? "bg-primary" : "bg-border")}
          style={{ width: i === current ? 18 : 7, height: 7 }}
        />
      ))}
    </View>
  );
}

// ── Step components ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const items = [
    "Your identity & tax profile",
    "Opening balance sheet — your net worth starts non-zero",
    "Income sources with real amounts",
    "A scored risk-tolerance profile",
    "Your financial goals",
  ];
  return (
    <View className="items-center">
      <Logo size={64} />
      <Text
        className="text-foreground mt-5 text-center"
        style={{ fontFamily: "DMSans_700Bold", fontSize: 22, letterSpacing: -0.5 }}
      >
        Welcome to Salli
      </Text>
      <Text className="text-muted-foreground text-[13px] text-center mt-2 px-2">
        Your personal finance and tax assistant for Sri Lanka. A real fact-find — it only takes a
        few minutes and your numbers start working for you immediately.
      </Text>

      <View className="bg-muted rounded-xl p-4 mt-6 w-full gap-3">
        <Text className="text-foreground text-[12px]" style={{ fontFamily: "DMSans_700Bold" }}>
          What we&apos;ll set up:
        </Text>
        {items.map((item) => (
          <View key={item} className="flex-row items-start gap-2">
            <View className="w-4 h-4 rounded-full bg-foreground/10 items-center justify-center mt-0.5">
              <Check size={10} color="#000" />
            </View>
            <Text className="text-muted-foreground text-[12px] flex-1">{item}</Text>
          </View>
        ))}
      </View>

      <PillButton variant="primary" onPress={onNext} className="mt-6 px-8">
        Get started
      </PillButton>
    </View>
  );
}

function IdentityStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  return (
    <View>
      <Heading title="About you" subtitle="Basic personal & tax details for your profile." />
      <View className="gap-4">
        <View>
          <Label>Full name</Label>
          <TextField placeholder="e.g. Chandra Perera" value={data.display_name} onChangeText={(v) => onChange({ display_name: v })} />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Label>Date of birth (optional)</Label>
            <TextField placeholder="YYYY-MM-DD" value={data.date_of_birth} onChangeText={(v) => onChange({ date_of_birth: v })} />
          </View>
          <View className="flex-1">
            <Label>Dependents (optional)</Label>
            <TextField
              keyboardType="numeric"
              value={data.dependents_count}
              onChangeText={(v) => onChange({ dependents_count: v.replace(/[^0-9]/g, "") })}
            />
          </View>
        </View>
        <View>
          <Label>Residency status</Label>
          <View className="flex-row gap-2">
            {RESIDENCY_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.residency_status === opt.id}
                label={opt.label}
                onPress={() => onChange({ residency_status: opt.id })}
                className="flex-1"
              />
            ))}
          </View>
        </View>
        <View>
          <Label>Employment status</Label>
          <View className="flex-row flex-wrap gap-2">
            {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
              <Chip
                key={opt}
                selected={data.employment_status === opt}
                label={opt.replace("_", " ")}
                onPress={() => onChange({ employment_status: opt })}
                className="grow basis-[30%]"
              />
            ))}
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Label>Employer (optional)</Label>
            <TextField placeholder="e.g. Virtusa" value={data.employer} onChangeText={(v) => onChange({ employer: v })} />
          </View>
          <View className="flex-1">
            <Label>IRD number (optional)</Label>
            <TextField placeholder="e.g. 134012345" value={data.ird_number} onChangeText={(v) => onChange({ ird_number: v })} />
          </View>
        </View>
      </View>
    </View>
  );
}

function BalanceSheetStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  const theme = useThemeColors();
  const lines = data.balances;
  function setLine(i: number, patch: Partial<OpeningBalanceItem>) {
    onChange({ balances: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  }
  return (
    <View>
      <Heading
        title="Opening balances"
        subtitle="Declare what you already have — your net worth starts non-zero immediately. Optional; skip if you'd rather add these later."
      />
      <View className="gap-3">
        {lines.map((line, i) => (
          <View key={i} className="border border-border rounded-xl p-3 gap-2">
            <View className="flex-row gap-2">
              <TextField placeholder="Code (1100)" value={line.code} onChangeText={(v) => setLine(i, { code: v })} className="w-24" />
              <TextField placeholder="Name (Cash)" value={line.name} onChangeText={(v) => setLine(i, { name: v })} className="flex-1" />
              {lines.length > 1 && (
                <Pressable onPress={() => onChange({ balances: lines.filter((_, j) => j !== i) })} className="w-9 items-center justify-center">
                  <Trash2 color={theme.mutedForeground} size={16} />
                </Pressable>
              )}
            </View>
            <View className="flex-row gap-2">
              <Chip selected={line.type === "asset"} label="Asset" onPress={() => setLine(i, { type: "asset" })} className="flex-1" />
              <Chip selected={line.type === "liability"} label="Liability" onPress={() => setLine(i, { type: "liability" })} className="flex-1" />
            </View>
            <TextField
              placeholder="Amount"
              keyboardType="decimal-pad"
              value={line.amount ? String(line.amount) : ""}
              onChangeText={(v) => setLine(i, { amount: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
            />
          </View>
        ))}
        <Pressable onPress={() => onChange({ balances: [...lines, { ...EMPTY_BALANCE }] })} className="flex-row items-center gap-1.5 px-1 py-1">
          <Plus color={theme.foreground} size={14} />
          <Text className="text-foreground text-[12.5px]" style={{ fontFamily: "DMSans_700Bold" }}>Add balance</Text>
        </Pressable>
      </View>
    </View>
  );
}

function IncomeStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  const theme = useThemeColors();
  const lines = data.incomes;
  function setLine(i: number, patch: Partial<IncomeItem>) {
    onChange({ incomes: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  }
  return (
    <View>
      <Heading
        title="Income sources"
        subtitle="Declare a representative monthly amount per source — real numbers your FI score and cash-flow can use right away. Optional."
      />
      <View className="gap-3">
        {lines.map((line, i) => (
          <View key={i} className="border border-border rounded-xl p-3 gap-2">
            <View className="flex-row gap-2">
              <TextField placeholder="Code (4100)" value={line.code} onChangeText={(v) => setLine(i, { code: v })} className="w-24" />
              <TextField placeholder="Name (Salary)" value={line.name} onChangeText={(v) => setLine(i, { name: v })} className="flex-1" />
              {lines.length > 1 && (
                <Pressable onPress={() => onChange({ incomes: lines.filter((_, j) => j !== i) })} className="w-9 items-center justify-center">
                  <Trash2 color={theme.mutedForeground} size={16} />
                </Pressable>
              )}
            </View>
            <TextField
              placeholder="Monthly amount"
              keyboardType="decimal-pad"
              value={line.amount ? String(line.amount) : ""}
              onChangeText={(v) => setLine(i, { amount: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
            />
          </View>
        ))}
        <Pressable onPress={() => onChange({ incomes: [...lines, { ...EMPTY_INCOME }] })} className="flex-row items-center gap-1.5 px-1 py-1">
          <Plus color={theme.foreground} size={14} />
          <Text className="text-foreground text-[12.5px]" style={{ fontFamily: "DMSans_700Bold" }}>Add income source</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RiskStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  return (
    <View>
      <Heading title="Risk profile" subtitle="A few questions to score your risk tolerance for the AI advisor." />
      <View className="gap-4">
        <View>
          <Label>Investment time horizon (years)</Label>
          <TextField
            placeholder="e.g. 15"
            keyboardType="numeric"
            value={data.time_horizon_years}
            onChangeText={(v) => onChange({ time_horizon_years: v.replace(/[^0-9]/g, "") })}
          />
        </View>
        <View>
          <Label>If your portfolio dropped 20% in a month, you&apos;d…</Label>
          <View className="flex-row flex-wrap gap-2">
            {DRAWDOWN_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.drawdown_reaction === opt.id}
                label={opt.label}
                onPress={() => onChange({ drawdown_reaction: opt.id })}
                className="grow basis-[47%]"
              />
            ))}
          </View>
        </View>
        <View>
          <Label>How stable is your income?</Label>
          <View className="flex-row gap-2">
            {STABILITY_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.income_stability === opt.id}
                label={opt.label}
                onPress={() => onChange({ income_stability: opt.id })}
                className="flex-1"
              />
            ))}
          </View>
        </View>
        <View>
          <Label>Investment experience</Label>
          <View className="flex-row gap-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.investment_experience === opt.id}
                label={opt.label}
                onPress={() => onChange({ investment_experience: opt.id })}
                className="flex-1"
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function GoalsStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  const theme = useThemeColors();
  const goals = data.goals;
  function setGoal(i: number, patch: Partial<OnboardingGoalItem>) {
    onChange({ goals: goals.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  }
  return (
    <View>
      <Heading title="Your goals" subtitle="What are you working toward? Add as many as you like — optional." />
      <View className="gap-3">
        {goals.map((g, i) => (
          <View key={i} className="border border-border rounded-xl p-3 gap-2">
            <View className="flex-row items-center gap-2">
              <TextField placeholder="Goal name" value={g.name} onChangeText={(v) => setGoal(i, { name: v })} className="flex-1" />
              {goals.length > 1 && (
                <Pressable onPress={() => onChange({ goals: goals.filter((_, j) => j !== i) })} className="w-9 items-center justify-center">
                  <Trash2 color={theme.mutedForeground} size={16} />
                </Pressable>
              )}
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {GOAL_KIND_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setGoal(i, { kind: opt.id })}
                  className={`px-2.5 py-1 rounded-full border ${g.kind === opt.id ? "border-foreground bg-foreground/5" : "border-border"}`}
                >
                  <Text
                    className="text-[11px]"
                    style={{ fontFamily: g.kind === opt.id ? "DMSans_700Bold" : "DMSans_400Regular", color: theme.foreground }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-2">
              <TextField
                placeholder="Target amount (LKR)"
                keyboardType="decimal-pad"
                value={g.target_amount ? String(g.target_amount) : ""}
                onChangeText={(v) => setGoal(i, { target_amount: Number(v.replace(/[^0-9.]/g, "")) || 0 })}
                className="flex-1"
              />
              <TextField
                placeholder="Target date"
                value={g.target_date ?? ""}
                onChangeText={(v) => setGoal(i, { target_date: v })}
                className="flex-1"
              />
            </View>
          </View>
        ))}
        <Pressable onPress={() => onChange({ goals: [...goals, { ...EMPTY_GOAL }] })} className="flex-row items-center gap-1.5 px-1 py-1">
          <Plus color={theme.foreground} size={14} />
          <Text className="text-foreground text-[12.5px]" style={{ fontFamily: "DMSans_700Bold" }}>Add goal</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReviewStep({ data }: { data: WizardData }) {
  const validBalances = data.balances.filter((b) => b.code && b.amount);
  const validIncomes = data.incomes.filter((i) => i.code && i.amount);
  const validGoals = data.goals.filter((g) => g.name);

  return (
    <View>
      <Heading title="Review & complete" subtitle="Here's what we'll set up when you tap Finish." />
      <View className="gap-3">
        <View className="bg-muted rounded-xl p-4 gap-1.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">Profile</Text>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-[13px]">Name</Text>
            <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>{data.display_name || "—"}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-[13px]">Residency</Text>
            <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
              {data.residency_status === "resident" ? "Sri Lanka Resident" : "Non-Resident"}
            </Text>
          </View>
        </View>

        <View className="bg-muted rounded-xl p-4 gap-1.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
            Opening balances ({validBalances.length})
          </Text>
          {validBalances.length === 0 ? (
            <Text className="text-muted-foreground text-[13px]">None declared.</Text>
          ) : (
            validBalances.map((b, i) => (
              <View key={i} className="flex-row justify-between">
                <Text className="text-foreground text-[13px]">{b.name || b.code}</Text>
                <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>{b.amount.toLocaleString()}</Text>
              </View>
            ))
          )}
        </View>

        <View className="bg-muted rounded-xl p-4 gap-1.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
            Income sources ({validIncomes.length})
          </Text>
          {validIncomes.length === 0 ? (
            <Text className="text-muted-foreground text-[13px]">None declared.</Text>
          ) : (
            validIncomes.map((inc, i) => (
              <View key={i} className="flex-row justify-between">
                <Text className="text-foreground text-[13px]">{inc.name || inc.code}</Text>
                <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>{inc.amount.toLocaleString()}/mo</Text>
              </View>
            ))
          )}
        </View>

        <View className="bg-muted rounded-xl p-4 gap-1.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-1">
            Goals ({validGoals.length})
          </Text>
          {validGoals.length === 0 ? (
            <Text className="text-muted-foreground text-[13px]">None declared.</Text>
          ) : (
            validGoals.map((g, i) => (
              <View key={i} className="flex-row justify-between">
                <Text className="text-foreground text-[13px]">{g.name}</Text>
                <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
                  {g.target_amount ? g.target_amount.toLocaleString() : "—"}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setOnboardingComplete = useSalliStore((s) => s.setOnboardingComplete);

  function update(updates: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function canAdvance() {
    if (step === 1 && !data.display_name.trim()) return false;
    if (step === 4 && (!data.time_horizon_years || !data.drawdown_reaction || !data.income_stability || !data.investment_experience)) return false;
    return true;
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function finish() {
    setLoading(true);
    setError("");
    try {
      await updateProfileIdentity({
        display_name: data.display_name,
        date_of_birth: data.date_of_birth || undefined,
        dependents_count: data.dependents_count ? Number(data.dependents_count) : undefined,
        employment_status: data.employment_status || undefined,
        employment_type: data.employment_type || undefined,
        residency_status: data.residency_status,
        employer: data.employer || undefined,
        ird_number: data.ird_number || undefined,
      });

      const validBalances = data.balances.filter((b) => b.code && b.name && b.amount);
      if (validBalances.length > 0) await declareBalanceSheet(validBalances);

      const validIncomes = data.incomes.filter((i) => i.code && i.name && i.amount);
      if (validIncomes.length > 0) await declareIncome(validIncomes);

      await submitRiskQuestionnaire({
        time_horizon_years: Number(data.time_horizon_years),
        drawdown_reaction: data.drawdown_reaction,
        income_stability: data.income_stability,
        investment_experience: data.investment_experience,
        dependents_count: data.dependents_count ? Number(data.dependents_count) : 0,
      });

      const validGoals = data.goals.filter((g) => g.name);
      if (validGoals.length > 0) await declareGoals(validGoals);

      // Legacy completion call — still the only thing that flips the
      // onboarding_complete flag, and idempotently creates the base starter
      // accounts (skips any the balance-sheet/income steps already created).
      await apiFetch("POST", "/onboarding/complete", { name: data.display_name, income_sources: [] });

      setOnboardingComplete(true);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center">
          <View className="items-center mb-6 gap-3">
            <View className="flex-row items-center gap-2">
              <Logo size={28} />
              <Text className="text-foreground" style={{ fontFamily: "DMSans_700Bold", fontSize: 16 }}>Salli</Text>
            </View>
            {step > 0 && <StepDots current={step - 1} total={STEPS.length - 1} />}
          </View>

          <View className="bg-card rounded-2xl border border-border p-5">
            {step === 0 && <WelcomeStep onNext={next} />}
            {step === 1 && <IdentityStep data={data} onChange={update} />}
            {step === 2 && <BalanceSheetStep data={data} onChange={update} />}
            {step === 3 && <IncomeStep data={data} onChange={update} />}
            {step === 4 && <RiskStep data={data} onChange={update} />}
            {step === 5 && <GoalsStep data={data} onChange={update} />}
            {step === 6 && <ReviewStep data={data} />}

            {!!error && (
              <Text className="mt-4 text-[12px] text-rose-600 bg-rose-500/10 rounded-md px-3 py-2 border border-rose-500/30">
                {error}
              </Text>
            )}

            {step > 0 && (
              <View className="flex-row items-center justify-between mt-6 pt-5 border-t border-border">
                <PillButton variant="secondary" onPress={back} className="px-4">Back</PillButton>

                {isLastStep ? (
                  <PillButton variant="primary" onPress={finish} disabled={loading} loading={loading} className="px-6">
                    Finish setup
                  </PillButton>
                ) : (
                  <PillButton variant="primary" onPress={next} disabled={!canAdvance()} className="px-6">
                    Continue
                  </PillButton>
                )}
              </View>
            )}
          </View>

          {step > 0 && (
            <Text className="text-center text-muted-foreground text-[11px] mt-4">
              Step {step} of {STEPS.length - 1} — {STEPS[step]}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
