import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { Btn } from "@/components/Btn";
import { Highlight } from "@/components/Highlight";
import { WordUp } from "@/components/WordUp";
import { FeatureDeepDive } from "@/components/FeatureDeepDive";
import { CountUp } from "@/components/CountUp";
import { AppShot } from "@/components/AppShot";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything, on one honest ledger: accounting, tax, and AI guidance that all read from the same source of truth.",
  alternates: { canonical: "/features" },
};

const PILLARS = [
  {
    n: "01",
    tag: "Double-entry",
    title: "A real ledger",
    body: "Proper double-entry accounting under the hood: immutable, auditable, and honest to the rupee.",
    points: ["Every account, card, loan and investment in one place", "Append-only history you can audit", "Balances that always reconcile"],
  },
  {
    n: "02",
    tag: "Deterministic",
    title: "A Sri Lankan tax engine",
    body: "Relief, rate bands, the 15% foreign-service final tax, and credits, all computed against versioned packs, tested against the IRD's published rate bands.",
    points: ["APIT, AIT and foreign tax credits applied", "Versioned 2025/26 IRD tax pack", "Every rule recorded and reproducible"],
  },
  {
    n: "03",
    tag: "Grounded",
    title: "An AI advisor",
    body: "Reads your statements, explains your tax, and drafts guidance, powered by the ledger and engine, never guesswork.",
    points: ["Explains results in plain language", "Never invents a number", "Cites the rule behind every figure"],
  },
  {
    n: "04",
    tag: "Budgets · Freedom",
    title: "A full money toolkit",
    body: "Budgets, debt payoff, portfolio, insurance, reports and FI projections, all on the same trustworthy ledger.",
    points: ["Debt payoff & goal planning", "Net worth & Freedom projections", "Exportable reports"],
  },
];

const CAPS = [
  { k: "01", t: "Budgets", b: "Envelope or flexible budgets that stay live with your ledger." },
  { k: "02", t: "Portfolio", b: "Track holdings, cost basis and returns in LKR." },
  { k: "03", t: "Insurance", b: "Keep policies, premiums and renewals in one view." },
  { k: "04", t: "Reports", b: "Exportable statements ready for review or filing." },
  { k: "05", t: "Goals", b: "Set targets and watch progress against real numbers." },
  { k: "06", t: "Multi-account", b: "Local banks, cards, wallets and cash together." },
  { k: "07", t: "Reminders", b: "Never miss a due date, premium or filing deadline." },
  { k: "08", t: "Exports", b: "CSV and PDF exports whenever you need them." },
];

export default function FeaturesPage() {
  return (
    <div className="relative">
      <Header active="/features" />

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-20 pb-10 sm:px-10">
        <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red-ink">
          Features · Product tour
        </div>
        <h1 className="mt-5.5 max-w-[1000px] font-display text-[clamp(48px,8vw,116px)] font-extrabold leading-[0.9] tracking-[-0.05em]">
          <WordUp delay={0.05}>Everything,</WordUp> <WordUp delay={0.14}>on</WordUp> <WordUp delay={0.22}>one</WordUp>
          <br />
          <WordUp delay={0.32}>honest</WordUp> <WordUp delay={0.42}><Highlight>ledger.</Highlight></WordUp>
        </h1>
        <p className="mt-7.5 max-w-[520px] text-[clamp(17px,1.5vw,21px)] leading-[1.5] text-ink-60">
          Accounting, tax, and AI guidance that all read from the same source of truth. No
          copy-paste between apps, no numbers that quietly disagree.
        </p>
        <div className="mt-8.5 flex flex-wrap gap-3.5">
          <Btn href="/pricing" variant="accent" size="lg">
            Get started free
          </Btn>
          <Btn href="/#engine" variant="ghost" size="lg">
            See the engine
          </Btn>
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-22.5 pb-10 sm:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <Reveal key={p.n} className="rounded-card border-2 border-ink bg-card p-10 shadow-hard press">
              <div className="flex items-baseline justify-between">
                <div className="font-display text-[38px] font-extrabold tracking-[-0.03em] text-red">{p.n}</div>
                <div className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-40">{p.tag}</div>
              </div>
              <div className="mt-4 font-display text-[30px] font-bold tracking-[-0.025em]">{p.title}</div>
              <p className="mt-3 text-[15.5px] leading-[1.6] text-ink-60">{p.body}</p>
              <div className="mt-5.5 flex flex-col gap-2.5">
                {p.points.map((pt) => (
                  <div key={pt} className="flex items-start gap-2.5 text-[14.5px]">
                    <span className="flex-none font-mono font-bold text-green">✓</span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-2 mx-auto flex max-w-[1320px] flex-col gap-22 px-6 pt-22.5 pb-10 sm:px-10">
        <FeatureDeepDive
          title="Say it. Salli books it."
          body="Type or speak a transaction in plain language, and Salli drafts the correct double-entry for you to approve. Accounting rigour without the jargon."
          visual={
            <div className="flex justify-center">
              <AppShot src="/screens/app/02-entry.png" alt="Salli's add-entry screen, drafting a double-entry transaction from a plain sentence" width={278} />
            </div>
          }
        />
        <FeatureDeepDive
          reverse
          title="See exactly what you owe."
          body="Payable, deductions, bands and credits laid out clearly, then a guided return with a human-review checkpoint before you file."
          visual={
            <div className="flex justify-center">
              <AppShot src="/screens/app/04-tax.png" alt="Salli's Tax screen showing tax payable for 2025/26, the rate bands, and the credits applied" width={278} />
            </div>
          }
        />
        <FeatureDeepDive
          title="Plan the next ten years."
          body="Avalanche vs. snowball payoff, years-to-FI, and exportable reports, all on the same trustworthy ledger."
          extra={
            <div className="mt-7 flex gap-9">
              <div>
                <div className="font-mono font-display text-[36px] font-extrabold tracking-[-0.02em]">Nov 2029</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[.06em] text-ink-40">Debt-free date</div>
              </div>
              <div className="w-0.5 bg-ink" />
              <div>
                <div className="font-mono font-display text-[36px] font-extrabold tracking-[-0.02em] text-red">
                  <CountUp target={14.2} decimals={1} suffix=" yrs" />
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[.06em] text-ink-40">Years to FI</div>
              </div>
            </div>
          }
          visual={
            <div className="flex justify-center">
              <AppShot src="/screens/app/05-freedom.png" alt="Salli's Freedom screen showing the Freedom score and years to financial independence" width={278} />
            </div>
          }
        />
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-22.5 pb-10 sm:px-10">
        <h2 className="max-w-[640px] font-display text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          And the everyday things,
          <br />
          done <span className="text-red">properly.</span>
        </h2>
        <div className="mt-11 grid grid-cols-2 gap-4 md:grid-cols-4">
          {CAPS.map((c) => (
            <Reveal key={c.k} className="rounded-card border-2 border-ink bg-card p-6 press">
              <div className="font-mono text-[11px] font-semibold text-red-ink">{c.k}</div>
              <div className="mt-2.5 font-display text-[19px] font-bold tracking-[-0.015em]">{c.t}</div>
              <p className="mt-2 text-[13.5px] leading-[1.5] text-ink-50">{c.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-20 pb-25 sm:px-10">
        <div className="rounded-card bg-red px-6 py-[clamp(56px,8vw,104px)] text-center text-ink">
          <h2 className="font-display text-[clamp(40px,7vw,96px)] font-extrabold leading-[0.92] tracking-[-0.05em]">
            Stop guessing.
            <br />
            Start knowing.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3.5">
            <Btn href="/pricing" variant="ghost" size="lg">
              Get started free
            </Btn>
            <Btn href="/" variant="primary" size="lg">
              Back to home
            </Btn>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
