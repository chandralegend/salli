import { useRouter } from "expo-router";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LineChart,
  ListChecks,
  Target,
  Wallet,
} from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { updateProfileOnboardingProfilePatch } from "@/lib/api/sdk.gen";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Profile", "Income", "Risk", "Goals", "Review"];

const WELCOME_ITEMS = [
  { icon: Briefcase, title: "Your profile", detail: "Name, DOB, tax residency, employment" },
  { icon: Wallet, title: "Accounts & balances", detail: "Bank accounts, assets, liabilities" },
  { icon: LineChart, title: "Income sources", detail: "Employment, freelance, rental, other" },
  { icon: ListChecks, title: "Risk profile", detail: "Investment horizon & risk tolerance" },
  { icon: Target, title: "Financial goals", detail: "FIRE, home, emergency fund, debt-free" },
];

const EMPLOYMENT_OPTIONS = ["employed", "self_employed", "student", "retired"] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0); // 0 = Welcome, 1..5 = the 5 labeled steps

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [residency, setResidency] = useState<"resident" | "non_resident">("resident");
  const [employment, setEmployment] = useState<(typeof EMPLOYMENT_OPTIONS)[number]>("employed");
  const [irdNumber, setIrdNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const handleContinueFromAboutYou = async () => {
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

  if (step === 0) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="flex-1 px-6 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-5 items-center">
            <Logo size={56} />
            <Text className="mb-1.5 mt-3 text-center font-sans-bold text-[26px] tracking-tight text-foreground">
              Welcome to Salli
            </Text>
            <Text className="text-center text-[13px] leading-5 text-foreground/40">
              Your AI-powered financial companion,{"\n"}built for Sri Lanka.
            </Text>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <Text className="mb-3 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/30">
              We&apos;ll set up together in ~5 min
            </Text>
            <View className="gap-1.5">
              {WELCOME_ITEMS.map((item, i) => (
                <View
                  key={item.title}
                  className="flex-row items-center gap-3 rounded-control border border-foreground/[0.08] bg-card px-4 py-3"
                >
                  <View
                    className={cn(
                      "h-8 w-8 items-center justify-center rounded-[10px]",
                      i === 0 ? "bg-salli-accent" : "bg-foreground/[0.08]",
                    )}
                  >
                    <item.icon size={14} color={i === 0 ? "#FFFFFF" : colors.mutedForeground} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-sans-medium text-[13px] text-foreground">{item.title}</Text>
                    <Text className="text-[11px] text-foreground/30">{item.detail}</Text>
                  </View>
                  <ChevronRight size={12} color={colors.mutedForeground} strokeWidth={2} />
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="pt-3">
            <PillButton onPress={() => setStep(1)}>
              <Text className="font-sans-bold text-[15px] text-primary-foreground">Begin setup</Text>
              <ChevronRight size={13} color={colors.primaryForeground} strokeWidth={2.5} />
            </PillButton>
            <View className="mt-2 flex-row justify-center gap-3">
              <Text className="text-[11px] text-foreground/20">IRD-ready</Text>
              <Text className="text-[11px] text-foreground/10">·</Text>
              <Text className="text-[11px] text-foreground/20">100% private</Text>
              <Text className="text-[11px] text-foreground/10">·</Text>
              <Text className="text-[11px] text-foreground/20">~5 minutes</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (step === 1) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center justify-between px-5 pt-2.5">
            <Pressable
              onPress={() => setStep(0)}
              className="h-[34px] w-[34px] items-center justify-center rounded-full border border-foreground/[0.08] bg-foreground/[0.07]"
            >
              <ChevronLeft size={14} color={colors.foreground} strokeWidth={2} />
            </Pressable>
            <Text className="font-sans-medium text-[13px] text-foreground/35">1 of 5</Text>
            <View style={{ width: 34 }} />
          </View>

          <View className="flex-row gap-1 px-4 pb-1 pt-3">
            {STEP_LABELS.map((_, i) => (
              <View
                key={i}
                className={cn("h-[3px] flex-1 rounded-pill", i === 0 ? "bg-salli-accent" : "bg-foreground/[0.15]")}
              />
            ))}
          </View>
          <View className="flex-row justify-between px-4">
            {STEP_LABELS.map((label, i) => (
              <Text
                key={label}
                className={cn("text-[10px]", i === 0 ? "font-sans-medium text-salli-accent" : "text-foreground/20")}
              >
                {label}
              </Text>
            ))}
          </View>

          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
            <View className="pb-4 pt-4">
              <Text className="mb-1.5 font-sans-extrabold text-[28px] tracking-tight text-foreground">
                About You
              </Text>
              <Text className="text-[13px] text-foreground/35">
                Used to compute your IRD tax and FIRE plan.
              </Text>
            </View>

            <View className="gap-2">
              <TextField
                label="Full Name *"
                active
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
              />
              <TextField
                label="Date of Birth *"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
              />

              <View>
                <Text className="mb-1.5 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/30">
                  Tax Residency *
                </Text>
                <View className="flex-row rounded-pill border border-foreground/[0.08] bg-card p-1">
                  {(["resident", "non_resident"] as const).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setResidency(value)}
                      className={cn(
                        "h-9 flex-1 items-center justify-center rounded-pill",
                        residency === value && "bg-salli-accent",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-[13px] font-sans-semibold",
                          residency === value ? "text-white" : "text-foreground/35",
                        )}
                      >
                        {value === "resident" ? "Sri Lankan Resident" : "Non-Resident"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text className="mb-1.5 pl-0.5 text-[10px] font-sans-medium uppercase tracking-wide text-foreground/30">
                  Employment *
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      onPress={() => setEmployment(opt)}
                      className={cn(
                        "rounded-pill border px-3.5 py-1.5",
                        employment === opt
                          ? "border-transparent bg-salli-accent"
                          : "border-foreground/10 bg-foreground/[0.07]",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-[12px] font-sans-medium capitalize",
                          employment === opt ? "text-white" : "text-foreground/45",
                        )}
                      >
                        {opt.replace("_", "-")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <TextField
                label="IRD Number"
                optionalHint="optional"
                value={irdNumber}
                onChangeText={setIrdNumber}
                placeholder="Add for accurate tax pre-fill"
              />

              <PillButton
                className="mt-1"
                loading={saving}
                disabled={!fullName || !dateOfBirth}
                onPress={handleContinueFromAboutYou}
              >
                <Text className="font-sans-semibold text-[15px] text-primary-foreground">
                  Continue to Income
                </Text>
                <ChevronRight size={13} color={colors.primaryForeground} strokeWidth={2.5} />
              </PillButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Steps 2-5 (Income, Risk, Goals, Review) aren't mocked yet — see plan task 8.
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8" style={{ paddingTop: insets.top }}>
      <Text className="text-center font-sans-semibold text-[16px] text-foreground">
        {STEP_LABELS[step - 1]} step — coming next
      </Text>
      <Text className="text-center text-[13px] text-foreground/40">
        This step needs a design check-in before it's built.
      </Text>
      <Pressable onPress={() => setStep(1)} className="mt-2">
        <Text className="text-[13px] text-salli-accent">Back</Text>
      </Pressable>
    </View>
  );
}
