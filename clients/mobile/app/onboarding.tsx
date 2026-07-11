import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { TextField } from "@/components/ui/text-field";
import { PillButton } from "@/components/ui/pill-button";
import { Logo } from "@/components/Logo";
import { apiFetch } from "@/lib/api-fetch";
import { useSalliStore } from "@/lib/store";

// ── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  name: string;
  nic: string;
  residency: string;
  employer: string;
  employment_type: string;
  ird_number: string;
  income_sources: string[];
  primary_goal: string;
  goal_target_amount: string;
  goal_target_year: string;
  risk_appetite: string;
  motivation: string;
}

const GOAL_OPTIONS = [
  { id: "financial_independence", label: "Financial independence", desc: "Build enough to live off your investments" },
  { id: "retirement", label: "Comfortable retirement", desc: "Retire without money worries" },
  { id: "home", label: "Buy a home", desc: "Save toward a property" },
  { id: "emergency_fund", label: "Emergency fund", desc: "A safety net of 3–6 months" },
  { id: "debt_free", label: "Become debt-free", desc: "Clear loans and credit" },
  { id: "wealth_growth", label: "Grow my wealth", desc: "Invest and compound over time" },
];

const RISK_OPTIONS = [
  { id: "conservative", label: "Conservative", desc: "Protect capital, steady returns" },
  { id: "balanced", label: "Balanced", desc: "A mix of safety and growth" },
  { id: "aggressive", label: "Aggressive", desc: "Maximise growth, accept swings" },
];

const RESIDENCY_OPTIONS = [
  { id: "resident", label: "Sri Lanka Resident", desc: "Lived in SL for 183+ days this year" },
  { id: "non_resident", label: "Non-Resident", desc: "Based overseas most of the year" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { id: "permanent", label: "Permanent employee" },
  { id: "contract", label: "Contract / fixed-term" },
  { id: "self_employed", label: "Self-employed" },
  { id: "other", label: "Other" },
];

const INCOME_SOURCE_OPTIONS = [
  {
    id: "employment",
    label: "Employment",
    description: "Salary or wages from an employer",
    accounts: ["Employment Income (4100)", "APIT Receivable (4110)"],
  },
  {
    id: "freelance",
    label: "Freelance / Business",
    description: "Self-employment or business income",
    accounts: ["Freelance / Business Income (4200)", "Business Expenses (5100)"],
  },
  {
    id: "rental",
    label: "Rental Income",
    description: "Income from renting property",
    accounts: ["Rental Income (4300)", "Property & Maintenance Expenses (5200)"],
  },
  {
    id: "interest",
    label: "Interest Income",
    description: "Bank interest and fixed deposits",
    accounts: ["Interest Income (4400)", "AIT Receivable (4410)"],
  },
  {
    id: "foreign",
    label: "Foreign Remittances",
    description: "Income from abroad remitted via licensed bank",
    accounts: [
      "Foreign Service Income (4500)",
      "Foreign Currency Account (1300)",
      "Foreign Tax Credit Receivable (4510)",
    ],
  },
  {
    id: "dividends",
    label: "Dividends",
    description: "Dividend income from shares",
    accounts: ["Dividend Income (4600)"],
  },
];

const BASE_ACCOUNTS = [
  "Cash (1100)",
  "Bank Account — LKR (1200)",
  "Opening Equity (3000)",
  "General Expenses (5000)",
];

const STEPS = ["Welcome", "About you", "Work & tax", "Income sources", "Your goals", "Review"];

const DEFAULT_DATA: OnboardingData = {
  name: "",
  nic: "",
  residency: "resident",
  employer: "",
  employment_type: "",
  ird_number: "",
  income_sources: [],
  primary_goal: "",
  goal_target_amount: "",
  goal_target_year: "",
  risk_appetite: "",
  motivation: "",
};

// ── Shared bits ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="text-foreground text-[12px] mb-1.5"
      style={{ fontFamily: "DMSans_700Bold" }}
    >
      {children}
    </Text>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="mb-5">
      <Text
        className="text-foreground"
        style={{ fontFamily: "DMSans_700Bold", fontSize: 20, letterSpacing: -0.5 }}
      >
        {title}
      </Text>
      <Text className="text-muted-foreground text-[13px] mt-1">{subtitle}</Text>
    </View>
  );
}

/** Single-select chip used for residency / employment type / risk appetite / goals. */
function Chip({
  selected,
  label,
  desc,
  onPress,
  className,
}: {
  selected: boolean;
  label: string;
  desc?: string;
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
      {desc && (
        <Text
          className={
            (selected ? "text-background/70" : "text-muted-foreground") + " text-[11px] mt-0.5"
          }
        >
          {desc}
        </Text>
      )}
    </Pressable>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={
            "rounded-full " +
            (i <= current ? "bg-primary" : "bg-border")
          }
          style={{ width: i === current ? 18 : 7, height: 7 }}
        />
      ))}
    </View>
  );
}

// ── Step components ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const items = [
    "Your personal & tax profile",
    "Chart of accounts based on your income",
    "AI assistant configured for your situation",
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
        Your personal finance and tax assistant for Sri Lanka. Let&apos;s set up your profile
        — it only takes a minute.
      </Text>

      <View className="bg-muted rounded-xl p-4 mt-6 w-full gap-3">
        <Text
          className="text-foreground text-[12px]"
          style={{ fontFamily: "DMSans_700Bold" }}
        >
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

function AboutYouStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <View>
      <Heading title="About you" subtitle="Basic personal details for your profile" />

      <View className="gap-4">
        <View>
          <Label>Full name</Label>
          <TextField
            placeholder="e.g. Chandra Perera"
            value={data.name}
            onChangeText={(v) => onChange({ name: v })}
          />
        </View>

        <View>
          <Label>NIC number (optional)</Label>
          <TextField
            placeholder="e.g. 199012345678 or 901234567V"
            value={data.nic}
            onChangeText={(v) => onChange({ nic: v })}
          />
        </View>

        <View>
          <Label>Residency status</Label>
          <View className="flex-row gap-2">
            {RESIDENCY_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.residency === opt.id}
                label={opt.label}
                desc={opt.desc}
                onPress={() => onChange({ residency: opt.id })}
                className="flex-1"
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function WorkTaxStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <View>
      <Heading title="Work & tax" subtitle="Help us tailor your tax setup. All fields are optional." />

      <View className="gap-4">
        <View>
          <Label>Employer name (optional)</Label>
          <TextField
            placeholder="e.g. Virtusa Corporation"
            value={data.employer}
            onChangeText={(v) => onChange({ employer: v })}
          />
        </View>

        <View>
          <Label>Employment type</Label>
          <View className="flex-row flex-wrap gap-2">
            {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.employment_type === opt.id}
                label={opt.label}
                onPress={() => onChange({ employment_type: opt.id })}
                className="grow basis-[47%]"
              />
            ))}
          </View>
        </View>

        <View>
          <Label>IRD number (optional)</Label>
          <TextField
            placeholder="e.g. 134012345"
            value={data.ird_number}
            onChangeText={(v) => onChange({ ird_number: v })}
          />
          <Text className="text-muted-foreground text-[11px] mt-1.5">
            Your Inland Revenue Department taxpayer identification number
          </Text>
        </View>
      </View>
    </View>
  );
}

function IncomeSourcesStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}) {
  function toggle(id: string) {
    const next = data.income_sources.includes(id)
      ? data.income_sources.filter((s) => s !== id)
      : [...data.income_sources, id];
    onChange({ income_sources: next });
  }

  return (
    <View>
      <Heading
        title="Income sources"
        subtitle="Select all that apply. We'll create the right accounts for you automatically."
      />

      <View className="gap-2">
        {INCOME_SOURCE_OPTIONS.map((opt) => {
          const selected = data.income_sources.includes(opt.id);
          return (
            <Pressable
              key={opt.id}
              onPress={() => toggle(opt.id)}
              className={
                "flex-row items-start gap-3 px-4 py-3 rounded-xl border " +
                (selected ? "bg-foreground/5 border-foreground" : "bg-card border-border")
              }
            >
              <View
                className={
                  "w-4 h-4 rounded border items-center justify-center mt-0.5 " +
                  (selected ? "bg-foreground border-foreground" : "border-border")
                }
              >
                {selected && <Check size={9} color="#fff" />}
              </View>
              <View className="flex-1">
                <Text
                  className="text-foreground text-[13px]"
                  style={{ fontFamily: "DMSans_700Bold" }}
                >
                  {opt.label}
                </Text>
                <Text className="text-muted-foreground text-[11px] mt-0.5">
                  {opt.description}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {data.income_sources.length === 0 && (
        <Text className="text-[12px] text-amber-600 bg-amber-500/10 rounded-md px-3 py-2 border border-amber-500/30 mt-3">
          Select at least one income source so we can set up the right accounts.
        </Text>
      )}
    </View>
  );
}

function GoalsStep({
  data,
  onChange,
}: {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}) {
  return (
    <View>
      <Heading
        title="Your goals"
        subtitle="Tell us what you're working toward so the advisor can guide you there."
      />

      <View className="gap-4">
        <View>
          <Label>What matters most right now?</Label>
          <View className="flex-row flex-wrap gap-2">
            {GOAL_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.primary_goal === opt.id}
                label={opt.label}
                desc={opt.desc}
                onPress={() => onChange({ primary_goal: opt.id })}
                className="grow basis-[47%]"
              />
            ))}
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Label>Target amount (LKR, optional)</Label>
            <TextField
              placeholder="e.g. 25,000,000"
              keyboardType="numeric"
              value={data.goal_target_amount}
              onChangeText={(v) => onChange({ goal_target_amount: v.replace(/[^0-9.]/g, "") })}
            />
          </View>
          <View className="flex-1">
            <Label>By year (optional)</Label>
            <TextField
              placeholder="e.g. 2040"
              keyboardType="numeric"
              value={data.goal_target_year}
              onChangeText={(v) => onChange({ goal_target_year: v.replace(/[^0-9]/g, "").slice(0, 4) })}
            />
          </View>
        </View>

        <View>
          <Label>How do you feel about investment risk?</Label>
          <View className="flex-row gap-2">
            {RISK_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                selected={data.risk_appetite === opt.id}
                label={opt.label}
                desc={opt.desc}
                onPress={() => onChange({ risk_appetite: opt.id })}
                className="flex-1"
              />
            ))}
          </View>
        </View>

        <View>
          <Label>What&apos;s your motivation? (optional)</Label>
          <TextInput
            placeholder="e.g. Retire by 50 and travel; give my kids a debt-free start."
            placeholderTextColor="#7DA6A9"
            value={data.motivation}
            onChangeText={(v) => onChange({ motivation: v })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="w-full px-4 py-3 border-[1.5px] border-border rounded-[14px] text-[13px] text-foreground bg-muted"
            style={{ fontFamily: "DMSans_400Regular", minHeight: 80 }}
          />
        </View>
      </View>
    </View>
  );
}

function ReviewStep({ data }: { data: OnboardingData }) {
  const selectedSources = INCOME_SOURCE_OPTIONS.filter((o) =>
    data.income_sources.includes(o.id),
  );
  const allAccounts = [...BASE_ACCOUNTS, ...selectedSources.flatMap((s) => s.accounts)];

  return (
    <View>
      <Heading title="Review & complete" subtitle="Here's what we'll create when you tap Finish." />

      <View className="gap-4">
        <View className="bg-muted rounded-xl p-4 gap-2.5">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Your profile
          </Text>

          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-[13px]">Name</Text>
            <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
              {data.name || "—"}
            </Text>
          </View>
          {!!data.nic && (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-[13px]">NIC</Text>
              <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
                {data.nic}
              </Text>
            </View>
          )}
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-[13px]">Residency</Text>
            <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
              {data.residency === "resident" ? "Sri Lanka Resident" : "Non-Resident"}
            </Text>
          </View>
          {!!data.employer && (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-[13px]">Employer</Text>
              <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
                {data.employer}
              </Text>
            </View>
          )}
          {!!data.ird_number && (
            <View className="flex-row justify-between">
              <Text className="text-muted-foreground text-[13px]">IRD No.</Text>
              <Text className="text-foreground text-[13px]" style={{ fontFamily: "DMSans_700Bold" }}>
                {data.ird_number}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-muted rounded-xl p-4 gap-2">
          <Text className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            Accounts to be created ({allAccounts.length})
          </Text>
          <View className="gap-1">
            {allAccounts.map((account) => (
              <View key={account} className="flex-row items-center gap-2">
                <View className="w-1 h-1 rounded-full bg-foreground/40" />
                <Text className="text-foreground text-[12px]">{account}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const setOnboardingComplete = useSalliStore((s) => s.setOnboardingComplete);

  function update(updates: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function canAdvance() {
    if (step === 1 && !data.name.trim()) return false;
    if (step === 3 && data.income_sources.length === 0) return false;
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
      const payload = {
        ...data,
        goal_target_amount: data.goal_target_amount ? Number(data.goal_target_amount) : 0,
      };
      await apiFetch("POST", "/onboarding/complete", payload);
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
          {/* Header */}
          <View className="items-center mb-6 gap-3">
            <View className="flex-row items-center gap-2">
              <Logo size={28} />
              <Text
                className="text-foreground"
                style={{ fontFamily: "DMSans_700Bold", fontSize: 16 }}
              >
                Salli
              </Text>
            </View>
            {step > 0 && <StepDots current={step - 1} total={STEPS.length - 1} />}
          </View>

          {/* Card */}
          <View className="bg-card rounded-2xl border border-border p-5">
            {step === 0 && <WelcomeStep onNext={next} />}
            {step === 1 && <AboutYouStep data={data} onChange={update} />}
            {step === 2 && <WorkTaxStep data={data} onChange={update} />}
            {step === 3 && <IncomeSourcesStep data={data} onChange={update} />}
            {step === 4 && <GoalsStep data={data} onChange={update} />}
            {step === 5 && <ReviewStep data={data} />}

            {!!error && (
              <Text className="mt-4 text-[12px] text-rose-600 bg-rose-500/10 rounded-md px-3 py-2 border border-rose-500/30">
                {error}
              </Text>
            )}

            {/* Navigation — not shown on welcome step (it has its own button) */}
            {step > 0 && (
              <View className="flex-row items-center justify-between mt-6 pt-5 border-t border-border">
                <PillButton variant="secondary" onPress={back} className="px-4">
                  Back
                </PillButton>

                {isLastStep ? (
                  <PillButton
                    variant="primary"
                    onPress={finish}
                    disabled={loading}
                    loading={loading}
                    className="px-6"
                  >
                    Finish setup
                  </PillButton>
                ) : (
                  <PillButton
                    variant="primary"
                    onPress={next}
                    disabled={!canAdvance()}
                    className="px-6"
                  >
                    Continue
                  </PillButton>
                )}
              </View>
            )}
          </View>

          {/* Step label */}
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
