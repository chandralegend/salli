"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ChevronRight, ChevronLeft } from "lucide-react";
import { getStoredToken, setOnboardingComplete } from "@/lib/store";
import { API_URL } from "@/lib/api-client";
import { Logo } from "@/components/Logo";

// ── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  name: string;
  nic: string;
  residency: string;
  employer: string;
  employment_type: string;
  ird_number: string;
  income_sources: string[];
}

// ── Income source options ────────────────────────────────────────────────────

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
    accounts: ["Foreign Service Income (4500)", "Foreign Currency Account (1300)", "Foreign Tax Credit Receivable (4510)"],
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

const STEPS = ["Welcome", "About you", "Work & tax", "Income sources", "Review"];

// ── Step components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`
              w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors
              ${i < current ? "bg-foreground text-background" : i === current ? "bg-foreground text-background ring-2 ring-offset-2 ring-foreground/30" : "bg-muted text-muted-foreground"}
            `}
          >
            {i < current ? <Check className="size-3" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-px mx-1 ${i < current ? "bg-foreground" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <Logo className="size-16 rounded-2xl mx-auto" />
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Welcome to Salli</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Your personal finance and tax assistant for Sri Lanka. Let&apos;s set up your profile — it only takes a minute.
        </p>
      </div>
      <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3 max-w-sm mx-auto">
        <p className="text-[12px] font-medium text-foreground">What we&apos;ll set up:</p>
        {["Your personal & tax profile", "Chart of accounts based on your income", "AI assistant configured for your situation"].map((item) => (
          <div key={item} className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="size-2.5 text-foreground" />
            </div>
            <p className="text-[12px] text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>
      <Button onClick={onNext} className="h-10 px-8">
        Get started <ChevronRight className="size-4 ml-1" />
      </Button>
    </div>
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">About you</h2>
        <p className="text-sm text-muted-foreground mt-1">Basic personal details for your profile</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Full name</Label>
          <Input
            placeholder="e.g. Chandra Perera"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-9 text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">
            NIC number <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. 199012345678 or 901234567V"
            value={data.nic}
            onChange={(e) => onChange({ nic: e.target.value })}
            className="h-9 text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Residency status</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "resident", label: "Sri Lanka Resident", desc: "Lived in SL for 183+ days this year" },
              { id: "non_resident", label: "Non-Resident", desc: "Based overseas most of the year" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ residency: opt.id })}
                className={`
                  text-left px-3 py-3 rounded-lg border text-[12px] transition-colors
                  ${data.residency === opt.id ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40"}
                `}
              >
                <div className="font-medium text-foreground">{opt.label}</div>
                <div className="text-muted-foreground mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Work & tax</h2>
        <p className="text-sm text-muted-foreground mt-1">Help us tailor your tax setup. All fields are optional.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">
            Employer name <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Virtusa Corporation"
            value={data.employer}
            onChange={(e) => onChange({ employer: e.target.value })}
            className="h-9 text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Employment type</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "permanent", label: "Permanent employee" },
              { id: "contract", label: "Contract / fixed-term" },
              { id: "self_employed", label: "Self-employed" },
              { id: "other", label: "Other" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ employment_type: opt.id })}
                className={`
                  text-left px-3 py-2.5 rounded-lg border text-[12px] transition-colors
                  ${data.employment_type === opt.id ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:border-foreground/40"}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">
            IRD number <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. 134012345"
            value={data.ird_number}
            onChange={(e) => onChange({ ird_number: e.target.value })}
            className="h-9 text-[13px]"
          />
          <p className="text-[11px] text-muted-foreground">
            Your Inland Revenue Department taxpayer identification number
          </p>
        </div>
      </div>
    </div>
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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Income sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select all that apply. We&apos;ll create the right accounts for you automatically.
        </p>
      </div>

      <div className="space-y-2">
        {INCOME_SOURCE_OPTIONS.map((opt) => {
          const selected = data.income_sources.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={`
                w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-start gap-3
                ${selected ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/30"}
              `}
            >
              <div
                className={`
                  w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center
                  ${selected ? "bg-foreground border-foreground" : "border-border"}
                `}
              >
                {selected && <Check className="size-2.5 text-background" />}
              </div>
              <div>
                <div className="text-[13px] font-medium text-foreground">{opt.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {data.income_sources.length === 0 && (
        <p className="text-[12px] text-amber-600 bg-amber-50 rounded-md px-3 py-2 border border-amber-200">
          Select at least one income source so we can set up the right accounts.
        </p>
      )}
    </div>
  );
}

function ReviewStep({ data }: { data: OnboardingData }) {
  const selectedSources = INCOME_SOURCE_OPTIONS.filter((o) =>
    data.income_sources.includes(o.id)
  );

  const allAccounts = [
    ...BASE_ACCOUNTS,
    ...selectedSources.flatMap((s) => s.accounts),
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Review & complete</h2>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s what we&apos;ll create when you click Finish.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-muted/40 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Your profile</p>
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{data.name || "—"}</span>
            </div>
            {data.nic && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">NIC</span>
                <span className="font-medium">{data.nic}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Residency</span>
              <span className="font-medium">{data.residency === "resident" ? "Sri Lanka Resident" : "Non-Resident"}</span>
            </div>
            {data.employer && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employer</span>
                <span className="font-medium">{data.employer}</span>
              </div>
            )}
            {data.ird_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IRD No.</span>
                <span className="font-medium">{data.ird_number}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-muted/40 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Accounts to be created ({allAccounts.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {allAccounts.map((account) => (
              <div key={account} className="flex items-center gap-2 text-[12px]">
                <div className="w-1 h-1 rounded-full bg-foreground/40 flex-shrink-0" />
                <span className="text-foreground">{account}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const DEFAULT_DATA: OnboardingData = {
  name: "",
  nic: "",
  residency: "resident",
  employer: "",
  employment_type: "",
  ird_number: "",
  income_sources: [],
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/onboarding/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Error ${res.status}`);
      }
      setOnboardingComplete();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-background ledger-paper flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="font-semibold text-foreground">Salli</span>
          </div>
          {step > 0 && (
            <StepIndicator current={step} total={STEPS.length - 1} />
          )}
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl ring-1 ring-foreground/8 shadow-sm p-6 md:p-8">
          {step === 0 && <WelcomeStep onNext={next} />}
          {step === 1 && <AboutYouStep data={data} onChange={update} />}
          {step === 2 && <WorkTaxStep data={data} onChange={update} />}
          {step === 3 && <IncomeSourcesStep data={data} onChange={update} />}
          {step === 4 && <ReviewStep data={data} />}

          {error && (
            <p className="mt-4 text-[12px] text-rose-600 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
              {error}
            </p>
          )}

          {/* Navigation — not shown on welcome step (it has its own button) */}
          {step > 0 && (
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={back} className="gap-1">
                <ChevronLeft className="size-4" />
                Back
              </Button>

              {isLastStep ? (
                <Button
                  onClick={finish}
                  disabled={loading}
                  className="gap-1 px-6"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  Finish setup
                </Button>
              ) : (
                <Button
                  onClick={next}
                  disabled={!canAdvance()}
                  className="gap-1"
                >
                  Continue
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Step label */}
        {step > 0 && (
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Step {step} of {STEPS.length - 1} — {STEPS[step]}
          </p>
        )}
      </div>
    </div>
  );
}
