import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { MagneticButton } from "@/components/MagneticButton";
import { Highlight } from "@/components/Highlight";
import { WordUp } from "@/components/WordUp";
import { FeatureDeepDive } from "@/components/FeatureDeepDive";
import { CountUp } from "@/components/CountUp";
import { TiltCard } from "@/components/TiltCard";

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
    body: "Relief, rate bands, the 15% foreign-service final tax, and credits, all computed against versioned, CA-reviewed packs.",
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
        <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red">
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
          <MagneticButton href="/pricing" className="rounded-full bg-red px-8 py-4.5 text-[17px] font-bold text-cream shadow-[0_16px_34px_-14px_rgba(245,49,15,.8)]">
            Get started free
          </MagneticButton>
          <MagneticButton href="/#engine" className="rounded-full border-2 border-ink px-7.5 py-4 text-[17px] font-bold hover:bg-ink hover:text-cream">
            See the engine
          </MagneticButton>
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-22.5 pb-10 sm:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <Reveal key={p.n} className="rounded-[28px] border border-ink/5 bg-white p-10 shadow-[0_24px_60px_-34px_rgba(22,19,15,.35)] transition-transform hover:-translate-y-1.5">
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
          eyebrow="AI quick-add"
          title="Say it. Salli books it."
          body="Type or speak a transaction in plain language, and Salli drafts the correct double-entry for you to approve. Accounting rigour without the jargon."
          visual={
            <TiltCard className="rounded-[28px] border border-ink/5 bg-white p-6 shadow-[0_34px_70px_-30px_rgba(22,19,15,.4)]">
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-[16px_16px_4px_16px] bg-ink px-4 py-3 text-[14.5px] text-cream">
                  Spent 4,500 on groceries at Keells
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2.5">
                <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-red font-display text-sm font-extrabold text-cream">S</span>
                <div className="w-full rounded-[4px_16px_16px_16px] bg-cream-soft p-4">
                  <div className="mb-2.75 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink-40">
                    Draft · review to post
                  </div>
                  <div className="flex justify-between border-b border-dashed border-ink/16 py-1.5 font-mono text-[13.5px]">
                    <span className="text-ink-50">Dr · Groceries</span>
                    <span className="font-semibold">4,500.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-mono text-[13.5px]">
                    <span className="text-ink-50">Cr · Card</span>
                    <span className="font-semibold">4,500.00</span>
                  </div>
                </div>
              </div>
            </TiltCard>
          }
        />
        <FeatureDeepDive
          reverse
          eyebrow="Tax overview &amp; return prep"
          title="See exactly what you owe."
          body="Payable, deductions, bands and credits laid out clearly, then a guided return with a human-review checkpoint before you file."
          visual={
            <TiltCard className="rounded-3xl bg-white p-7 shadow-[0_34px_70px_-30px_rgba(245,49,15,.35),0_0_0_1px_rgba(22,19,15,.05)]">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-40">Payable · YA 2025/26</div>
                <span className="rounded-full bg-green/12 px-2.5 py-1 font-mono text-[10.5px] font-semibold text-green">
                  On track
                </span>
              </div>
              <div className="mt-1.5 font-mono font-display text-[38px] font-extrabold tracking-[-0.02em]">
                LKR 186,420
              </div>
              <div className="mt-5.5 flex flex-col gap-2.75">
                {[
                  { label: "First 1,000,000", rate: "6%", pct: 34 },
                  { label: "Next 500,000", rate: "18%", pct: 68 },
                  { label: "Next 500,000", rate: "24%", pct: 100 },
                ].map((b) => (
                  <div key={b.rate}>
                    <div className="flex justify-between font-mono text-[11.5px] text-ink-50">
                      <span>{b.label}</span>
                      <span className="font-semibold text-ink">{b.rate}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-soft">
                      <div className="h-full rounded-full bg-red" style={{ width: `${b.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5.5 flex items-center justify-between border-t border-dashed border-ink/14 pt-4">
                <div className="font-mono text-[12px] text-ink-50">APIT + AIT credits</div>
                <div className="font-mono text-[13.5px] font-semibold text-green">− LKR 160,500</div>
              </div>
              <div className="mt-4 flex h-11.5 items-center justify-center rounded-full bg-ink text-[13.5px] font-bold text-cream">
                Start guided return →
              </div>
            </TiltCard>
          }
        />
        <FeatureDeepDive
          eyebrow="Debt · Freedom · Reports"
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
            <TiltCard className="rounded-3xl bg-white p-7 shadow-[0_34px_70px_-30px_rgba(22,19,15,.4),0_0_0_1px_rgba(22,19,15,.05)]">
              <div className="font-mono text-[11px] uppercase tracking-[.08em] text-ink-40">Payoff plan · Avalanche</div>
              <div className="mt-4.5 flex flex-col gap-3.5">
                {[
                  { label: "Credit card", pct: 72, tone: "bg-red" },
                  { label: "Personal loan", pct: 41, tone: "bg-ink" },
                  { label: "Store instalment", pct: 100, tone: "bg-green" },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="flex justify-between font-mono text-[12px] text-ink-50">
                      <span>{d.label}</span>
                      <span className="font-semibold text-ink">{d.pct}% paid</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-cream-soft">
                      <div className={`h-full rounded-full ${d.tone}`} style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-4 rounded-2xl bg-cream-soft p-4">
                <div
                  className="relative flex size-15.5 flex-none items-center justify-center rounded-full"
                  style={{ background: "conic-gradient(var(--color-green) 223deg, var(--color-cream-80) 0deg)" }}
                >
                  <div className="flex size-11.5 items-center justify-center rounded-full bg-white font-mono text-[12px] font-bold">
                    62%
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[.06em] text-ink-40">Freedom progress</div>
                  <div className="font-display text-[15px] font-bold">14.2 years to go</div>
                </div>
              </div>
            </TiltCard>
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
            <Reveal key={c.k} className="rounded-[18px] border border-ink/7 bg-white p-6 transition-transform hover:-translate-y-1 hover:border-red">
              <div className="font-mono text-[11px] font-semibold text-red">{c.k}</div>
              <div className="mt-2.5 font-display text-[19px] font-bold tracking-[-0.015em]">{c.t}</div>
              <p className="mt-2 text-[13.5px] leading-[1.5] text-ink-50">{c.b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-20 pb-25 sm:px-10">
        <div className="rounded-[36px] bg-red px-6 py-[clamp(56px,8vw,104px)] text-center text-cream">
          <h2 className="font-display text-[clamp(40px,7vw,96px)] font-extrabold leading-[0.92] tracking-[-0.05em]">
            Stop guessing.
            <br />
            Start knowing.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3.5">
            <MagneticButton href="/pricing" className="rounded-full bg-cream px-8.5 py-4.5 text-[17px] font-bold text-ink">
              Get started free
            </MagneticButton>
            <MagneticButton href="/" className="rounded-full border-2 border-cream/60 px-8 py-4 text-[17px] font-bold hover:bg-cream/14">
              Back to home
            </MagneticButton>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
