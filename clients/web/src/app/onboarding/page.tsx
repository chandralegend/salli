"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { getStoredToken, setOnboardingComplete } from "@/lib/store";
import { API_URL } from "@/lib/api-client";
import { Logo } from "@/components/Logo";
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

// ── Step components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
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
            <div className={`w-6 h-px mx-1 ${i < current ? "bg-foreground" : "bg-border"}`} />
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
          Your personal finance and tax assistant for Sri Lanka. A real fact-find — it only
          takes a few minutes and your numbers start working for you immediately.
        </p>
      </div>
      <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3 max-w-sm mx-auto">
        <p className="text-[12px] font-medium text-foreground">What we&apos;ll set up:</p>
        {[
          "Your identity & tax profile",
          "Opening balance sheet — your net worth starts non-zero",
          "Income sources with real amounts",
          "A scored risk-tolerance profile",
          "Your financial goals",
        ].map((item) => (
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

function IdentityStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">About you</h2>
        <p className="text-sm text-muted-foreground mt-1">Basic personal & tax details for your profile.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Full name</Label>
          <Input placeholder="e.g. Chandra Perera" value={data.display_name} onChange={(e) => onChange({ display_name: e.target.value })} className="h-9 text-[13px]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Date of birth <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="date" value={data.date_of_birth} onChange={(e) => onChange({ date_of_birth: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Dependents <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input inputMode="numeric" value={data.dependents_count} onChange={(e) => onChange({ dependents_count: e.target.value.replace(/[^0-9]/g, "") })} className="h-9 text-[13px]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Residency status</Label>
          <div className="grid grid-cols-2 gap-2">
            {[{ id: "resident", label: "Sri Lanka Resident" }, { id: "non_resident", label: "Non-Resident" }].map((opt) => (
              <button key={opt.id} type="button" onClick={() => onChange({ residency_status: opt.id })}
                className={`text-left px-3 py-2.5 rounded-lg border text-[12px] transition-colors ${data.residency_status === opt.id ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:border-foreground/40"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Employment status</Label>
          <div className="grid grid-cols-3 gap-2">
            {["employed", "self_employed", "unemployed", "student", "retired"].map((opt) => (
              <button key={opt} type="button" onClick={() => onChange({ employment_status: opt })}
                className={`text-left px-2.5 py-2 rounded-lg border text-[11.5px] capitalize transition-colors ${data.employment_status === opt ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:border-foreground/40"}`}>
                {opt.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">Employer <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. Virtusa" value={data.employer} onChange={(e) => onChange({ employer: e.target.value })} className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium">IRD number <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g. 134012345" value={data.ird_number} onChange={(e) => onChange({ ird_number: e.target.value })} className="h-9 text-[13px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BalanceSheetStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  const lines = data.balances;
  function setLine(i: number, patch: Partial<OpeningBalanceItem>) {
    onChange({ balances: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Opening balances</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Declare what you already have — your net worth starts non-zero immediately. Optional; skip if you&apos;d rather add these later.
        </p>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input placeholder="Code (e.g. 1100)" className="w-24 h-9 text-[12px]" value={line.code} onChange={(e) => setLine(i, { code: e.target.value })} />
            <Input placeholder="Name (e.g. Cash)" className="flex-1 h-9 text-[12px]" value={line.name} onChange={(e) => setLine(i, { name: e.target.value })} />
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["asset", "liability"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setLine(i, { type: t })}
                  className={`px-2.5 h-9 text-[11px] capitalize ${line.type === t ? "bg-foreground text-background" : "bg-transparent text-muted-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
            <Input placeholder="Amount" className="w-28 h-9 text-[12px]" value={line.amount || ""} onChange={(e) => setLine(i, { amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
            <button type="button" onClick={() => onChange({ balances: lines.filter((_, j) => j !== i) })} disabled={lines.length === 1}>
              <Trash2 className="size-4 text-destructive" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ balances: [...lines, { ...EMPTY_BALANCE }] })}
          className="flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground px-1 py-1">
          <Plus className="size-3.5" /> Add balance
        </button>
      </div>
    </div>
  );
}

function IncomeStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  const lines = data.incomes;
  function setLine(i: number, patch: Partial<IncomeItem>) {
    onChange({ incomes: lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Income sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Declare a representative monthly amount per source — real numbers your FI score and cash-flow can use right away. Optional.
        </p>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input placeholder="Code (e.g. 4100)" className="w-24 h-9 text-[12px]" value={line.code} onChange={(e) => setLine(i, { code: e.target.value })} />
            <Input placeholder="Name (e.g. Salary)" className="flex-1 h-9 text-[12px]" value={line.name} onChange={(e) => setLine(i, { name: e.target.value })} />
            <Input placeholder="Monthly amount" className="w-32 h-9 text-[12px]" value={line.amount || ""} onChange={(e) => setLine(i, { amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
            <button type="button" onClick={() => onChange({ incomes: lines.filter((_, j) => j !== i) })} disabled={lines.length === 1}>
              <Trash2 className="size-4 text-destructive" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ incomes: [...lines, { ...EMPTY_INCOME }] })}
          className="flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground px-1 py-1">
          <Plus className="size-3.5" /> Add income source
        </button>
      </div>
    </div>
  );
}

function RiskStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Risk profile</h2>
        <p className="text-sm text-muted-foreground mt-1">A few questions to score your risk tolerance for the AI advisor.</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Investment time horizon (years)</Label>
          <Input inputMode="numeric" placeholder="e.g. 15" value={data.time_horizon_years} onChange={(e) => onChange({ time_horizon_years: e.target.value.replace(/[^0-9]/g, "") })} className="h-9 text-[13px] w-32" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">If your portfolio dropped 20% in a month, you&apos;d…</Label>
          <div className="grid grid-cols-2 gap-2">
            {DRAWDOWN_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => onChange({ drawdown_reaction: opt.id })}
                className={`text-left px-3 py-2.5 rounded-lg border text-[12px] transition-colors ${data.drawdown_reaction === opt.id ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:border-foreground/40"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">How stable is your income?</Label>
          <div className="grid grid-cols-3 gap-2">
            {STABILITY_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => onChange({ income_stability: opt.id })}
                className={`text-left px-3 py-2.5 rounded-lg border text-[12px] transition-colors ${data.income_stability === opt.id ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:border-foreground/40"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium">Investment experience</Label>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button key={opt.id} type="button" onClick={() => onChange({ investment_experience: opt.id })}
                className={`text-left px-3 py-2.5 rounded-lg border text-[12px] transition-colors ${data.investment_experience === opt.id ? "border-foreground bg-foreground/5 font-medium" : "border-border hover:border-foreground/40"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalsStep({ data, onChange }: { data: WizardData; onChange: (u: Partial<WizardData>) => void }) {
  const goals = data.goals;
  function setGoal(i: number, patch: Partial<OnboardingGoalItem>) {
    onChange({ goals: goals.map((g, j) => (j === i ? { ...g, ...patch } : g)) });
  }
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Your goals</h2>
        <p className="text-sm text-muted-foreground mt-1">What are you working toward? Add as many as you like — optional.</p>
      </div>
      <div className="space-y-3">
        {goals.map((g, i) => (
          <div key={i} className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input placeholder="Goal name" className="flex-1 h-9 text-[12px]" value={g.name} onChange={(e) => setGoal(i, { name: e.target.value })} />
              <button type="button" onClick={() => onChange({ goals: goals.filter((_, j) => j !== i) })} disabled={goals.length === 1}>
                <Trash2 className="size-4 text-destructive" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_KIND_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" onClick={() => setGoal(i, { kind: opt.id })}
                  className={`px-2 py-1 rounded-full text-[11px] border transition-colors ${g.kind === opt.id ? "border-foreground bg-foreground/5 font-medium" : "border-border text-muted-foreground"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Target amount (LKR)" className="h-9 text-[12px]" value={g.target_amount || ""} onChange={(e) => setGoal(i, { target_amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
              <Input type="date" placeholder="Target date" className="h-9 text-[12px]" value={g.target_date ?? ""} onChange={(e) => setGoal(i, { target_date: e.target.value })} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange({ goals: [...goals, { ...EMPTY_GOAL }] })}
          className="flex items-center gap-1 text-[12px] font-medium text-foreground/70 hover:text-foreground px-1 py-1">
          <Plus className="size-3.5" /> Add goal
        </button>
      </div>
    </div>
  );
}

function ReviewStep({ data }: { data: WizardData }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Review & complete</h2>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s what we&apos;ll set up when you click Finish.</p>
      </div>
      <div className="space-y-3">
        <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-[13px]">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Profile</p>
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{data.display_name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Residency</span><span className="font-medium">{data.residency_status === "resident" ? "Sri Lanka Resident" : "Non-Resident"}</span></div>
        </div>
        <div className="bg-muted/40 rounded-xl p-4 text-[13px]">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Opening balances ({data.balances.filter((b) => b.code && b.amount).length})
          </p>
          {data.balances.filter((b) => b.code && b.amount).length === 0 ? (
            <p className="text-muted-foreground">None declared.</p>
          ) : data.balances.filter((b) => b.code && b.amount).map((b, i) => (
            <div key={i} className="flex justify-between"><span>{b.name || b.code}</span><span className="font-medium">{b.amount.toLocaleString()}</span></div>
          ))}
        </div>
        <div className="bg-muted/40 rounded-xl p-4 text-[13px]">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Income sources ({data.incomes.filter((i) => i.code && i.amount).length})
          </p>
          {data.incomes.filter((i) => i.code && i.amount).length === 0 ? (
            <p className="text-muted-foreground">None declared.</p>
          ) : data.incomes.filter((i) => i.code && i.amount).map((inc, i) => (
            <div key={i} className="flex justify-between"><span>{inc.name || inc.code}</span><span className="font-medium">{inc.amount.toLocaleString()}/mo</span></div>
          ))}
        </div>
        <div className="bg-muted/40 rounded-xl p-4 text-[13px]">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Goals ({data.goals.filter((g) => g.name).length})</p>
          {data.goals.filter((g) => g.name).length === 0 ? (
            <p className="text-muted-foreground">None declared.</p>
          ) : data.goals.filter((g) => g.name).map((g, i) => (
            <div key={i} className="flex justify-between"><span>{g.name}</span><span className="font-medium">{g.target_amount ? g.target_amount.toLocaleString() : "—"}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getStoredToken()) router.replace("/login");
  }, [router]);

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
      // onboarding_complete flag GET /onboarding/status checks, and it
      // idempotently creates the base starter accounts (skips any that
      // the balance-sheet/income steps above already created by code).
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: data.display_name, income_sources: [] }),
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
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo className="size-7" />
            <span className="font-semibold text-foreground">Salli</span>
          </div>
          {step > 0 && <StepIndicator current={step} total={STEPS.length - 1} />}
        </div>

        <div className="bg-card rounded-2xl ring-1 ring-foreground/8 shadow-sm p-6 md:p-8">
          {step === 0 && <WelcomeStep onNext={next} />}
          {step === 1 && <IdentityStep data={data} onChange={update} />}
          {step === 2 && <BalanceSheetStep data={data} onChange={update} />}
          {step === 3 && <IncomeStep data={data} onChange={update} />}
          {step === 4 && <RiskStep data={data} onChange={update} />}
          {step === 5 && <GoalsStep data={data} onChange={update} />}
          {step === 6 && <ReviewStep data={data} />}

          {error && (
            <p className="mt-4 text-[12px] text-rose-600 bg-rose-50 rounded-md px-3 py-2 border border-rose-200">
              {error}
            </p>
          )}

          {step > 0 && (
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={back} className="gap-1">
                <ChevronLeft className="size-4" />
                Back
              </Button>

              {isLastStep ? (
                <Button onClick={finish} disabled={loading} className="gap-1 px-6">
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  Finish setup
                </Button>
              ) : (
                <Button onClick={next} disabled={!canAdvance()} className="gap-1">
                  Continue
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {step > 0 && (
          <p className="text-center text-[11px] text-muted-foreground mt-4">
            Step {step} of {STEPS.length - 1} — {STEPS[step]}
          </p>
        )}
      </div>
    </div>
  );
}
