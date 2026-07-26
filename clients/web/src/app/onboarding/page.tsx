"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Briefcase,
  Building2,
  Check,
  Globe,
  Home,
  Landmark,
  Loader2,
  PiggyBank,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/lib/auth";
import { setOnboardingComplete, useSalliStore } from "@/lib/store";

const STEPS = ["Welcome", "About you", "Work & tax", "Income sources", "Your goals", "Review"];

type IncomeSource = "employment" | "freelance" | "rental" | "interest" | "foreign" | "dividends";

const INCOME_SOURCES: { key: IncomeSource; label: string; caption: string; icon: LucideIcon }[] = [
  { key: "employment", label: "Employment", caption: "salary, APIT withheld", icon: Briefcase },
  { key: "freelance", label: "Freelance", caption: "invoices & project income", icon: Banknote },
  { key: "rental", label: "Rental", caption: "property income", icon: Home },
  { key: "interest", label: "Interest", caption: "FDs & savings, AIT withheld", icon: Landmark },
  { key: "foreign", label: "Foreign", caption: "remitted service income (FSI)", icon: Globe },
  { key: "dividends", label: "Dividends", caption: "local shareholdings", icon: TrendingUp },
];

// Mirrors the backend's _BASE_ACCOUNTS / _SOURCE_ACCOUNTS — informational only;
// the API creates these on /onboarding/complete.
const BASE_ACCOUNTS = ["1100 · Cash", "1200 · Bank Account — LKR", "3000 · Opening Equity", "5000 · General Expenses"];
const SOURCE_ACCOUNTS: Record<IncomeSource, string[]> = {
  employment: ["4100 · Employment Income", "4110 · APIT Receivable"],
  freelance: ["4200 · Freelance / Business Income", "5100 · Business Expenses"],
  rental: ["4300 · Rental Income", "5200 · Property & Maintenance Expenses"],
  interest: ["4400 · Interest Income", "4410 · AIT Receivable"],
  foreign: ["1300 · Foreign Currency Account", "4500 · Foreign Service Income (FSI)", "4510 · Foreign Tax Credit Receivable"],
  dividends: ["4600 · Dividend Income"],
};

const GOALS = [
  { value: "financial_independence", label: "Financial independence" },
  { value: "retirement", label: "Retirement" },
  { value: "home", label: "Buy a home" },
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "debt_free", label: "Debt-free" },
  { value: "wealth_growth", label: "Wealth growth" },
];

const EMPLOYMENT_TYPES = [
  { value: "permanent", label: "Permanent" },
  { value: "contract", label: "Contract" },
  { value: "self_employed", label: "Self-employed" },
  { value: "other", label: "Other" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md bg-muted p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            value === o.value ? "bg-card border text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const setStoreComplete = useSalliStore((s) => s.setOnboardingComplete);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [nic, setNic] = useState("");
  const [residency, setResidency] = useState<"resident" | "non_resident">("resident");
  const [employer, setEmployer] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [irdNumber, setIrdNumber] = useState("");
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [risk, setRisk] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [motivation, setMotivation] = useState("");

  useEffect(() => {
    // Guard: no token → login. Delayed a tick so useAuth can hydrate from storage.
    const t = setTimeout(() => {
      if (!token && !localStorage.getItem("salli_token")) router.replace("/login");
    }, 300);
    return () => clearTimeout(t);
  }, [token, router]);

  function toggleSource(key: IncomeSource) {
    setSources((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
    setError(null);
  }

  function next() {
    setError(null);
    if (step === 1 && !name.trim()) {
      setError("Your name is required.");
      return;
    }
    if (step === 3 && sources.length === 0) {
      setError("Choose at least one.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("POST", "/onboarding/complete", {
        name: name.trim(),
        nic,
        residency,
        employer,
        employment_type: employmentType,
        ird_number: irdNumber,
        income_sources: sources,
        primary_goal: primaryGoal,
        goal_target_amount: targetAmount ? Number(targetAmount) : 0,
        goal_target_year: targetYear,
        risk_appetite: risk,
        motivation,
      });
      setOnboardingComplete();
      setStoreComplete(true);
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong saving your profile. Try again.");
      setBusy(false);
    }
  }

  const accountsPreview = [...BASE_ACCOUNTS, ...sources.flatMap((s) => SOURCE_ACCOUNTS[s])];

  return (
    <main className="min-h-screen bg-background px-4 pb-16">
      <p className="font-heading text-2xl font-extrabold tracking-tight pt-8 pl-4 sm:pl-8">
        Salli<span className="text-primary">.</span>
      </p>

      <div className="max-w-[560px] mx-auto mt-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-2">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center">
              <div
                className={cn(
                  "size-2 rounded-full transition-colors",
                  i < step && "bg-foreground",
                  i === step && "bg-foreground ring-2 ring-foreground/20 ring-offset-2 ring-offset-background",
                  i > step && "bg-border"
                )}
              />
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mb-6">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        <div className="rounded-lg border bg-card p-8 sm:p-10">
          {step === 0 && (
            <div className="space-y-5">
              <div className="size-12 rounded-lg bg-primary flex items-center justify-center">
                <PiggyBank className="size-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome to Salli</h1>
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                In the next minute we&apos;ll set up your profile, your tax details, and a chart of
                accounts tailored to how you earn. You can change all of this later.
              </p>
              <ul className="space-y-2.5">
                {["Your ledger, ready to post", "Sri Lanka tax, configured for YA 2025/26", "A Freedom baseline"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-[var(--status-success-text)]" /> {t}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">About you</h1>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Used on documents and for your tax profile.
                </p>
              </div>
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </Field>
              <Field label="NIC number" helper="Optional — needed only for filing documents">
                <Input value={nic} onChange={(e) => setNic(e.target.value)} placeholder="e.g. 199512345678" />
              </Field>
              <Field label="Residency" helper="Determines which relief and rates apply.">
                <Segmented
                  options={[
                    { value: "resident" as const, label: "Resident" },
                    { value: "non_resident" as const, label: "Non-resident" },
                  ]}
                  value={residency}
                  onChange={setResidency}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-xl font-semibold tracking-tight">Work &amp; tax</h1>
              <Field label="Employer">
                <Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Company name" />
              </Field>
              <Field label="Employment type">
                <Select value={employmentType} onValueChange={(v) => setEmploymentType(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="IRD taxpayer number (TIN)" helper="Optional — you can add this before filing.">
                <Input value={irdNumber} onChange={(e) => setIrdNumber(e.target.value)} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">How do you earn?</h1>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Pick everything that applies — we&apos;ll create the right ledger accounts.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INCOME_SOURCES.map((s) => {
                  const selected = sources.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => toggleSource(s.key)}
                      className={cn(
                        "relative flex items-start gap-3 rounded-md border p-3.5 text-left transition-colors",
                        selected ? "border-foreground bg-foreground/[0.03]" : "hover:border-muted-foreground/40"
                      )}
                    >
                      <s.icon className="size-4 mt-0.5 text-muted-foreground" />
                      <span>
                        <span className="block text-sm font-medium">{s.label}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">{s.caption}</span>
                      </span>
                      {selected && <Check className="absolute top-2.5 right-2.5 size-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h1 className="text-xl font-semibold tracking-tight">What are you working toward?</h1>
              <Field label="Primary goal">
                <Select value={primaryGoal} onValueChange={(v) => setPrimaryGoal(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Target amount (LKR)">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="25000000"
                  />
                </Field>
                <Field label="Target year">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    placeholder="2040"
                  />
                </Field>
              </div>
              <Field label="Risk appetite">
                <Segmented
                  options={[
                    { value: "conservative" as const, label: "Conservative" },
                    { value: "balanced" as const, label: "Balanced" },
                    { value: "aggressive" as const, label: "Aggressive" },
                  ]}
                  value={risk}
                  onChange={setRisk}
                />
              </Field>
              <Field label="What's driving this? (optional)" helper="Salli's advisor uses this to personalize guidance.">
                <Textarea rows={3} value={motivation} onChange={(e) => setMotivation(e.target.value)} />
              </Field>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h1 className="text-xl font-semibold tracking-tight">Ready to set up</h1>
              <div>
                <p className="eyebrow mb-3">Your profile</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  {[
                    ["Name", name || "—"],
                    ["NIC", nic || "—"],
                    ["Residency", residency === "resident" ? "Resident" : "Non-resident"],
                    ["Employer", employer || "—"],
                    ["Employment", EMPLOYMENT_TYPES.find((t) => t.value === employmentType)?.label ?? "—"],
                    ["TIN", irdNumber || "—"],
                    [
                      "Goal",
                      primaryGoal
                        ? `${GOALS.find((g) => g.value === primaryGoal)?.label}${targetAmount ? ` · LKR ${Number(targetAmount).toLocaleString()}` : ""}${targetYear ? ` by ${targetYear}` : ""}`
                        : "—",
                    ],
                    ["Risk", risk[0].toUpperCase() + risk.slice(1)],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground text-[13px]">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="eyebrow mb-3">Accounts we&apos;ll create for you</p>
                <div className="rounded-md bg-muted/60 border p-4 space-y-1.5">
                  {accountsPreview.map((a) => (
                    <p key={a} className="flex items-center gap-2 text-[13px]">
                      <Building2 className="size-3.5 text-muted-foreground" /> {a}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Based on your income sources. You can add more anytime.
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-[13px] text-destructive mt-5">{error}</p>}

          <div className="flex items-center justify-between mt-8">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>{step === 0 ? "Let's go" : "Continue"}</Button>
            ) : (
              <Button onClick={finish} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Setting up your ledger…
                  </>
                ) : (
                  "Finish setup"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
