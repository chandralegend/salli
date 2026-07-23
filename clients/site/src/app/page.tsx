import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/Loader";
import { HeroCanvas } from "@/components/HeroCanvas";
import { EngineCanvas } from "@/components/EngineCanvas";
import { Marquee, MarqueeItem } from "@/components/Marquee";
import { Reveal } from "@/components/Reveal";
import { TiltCard } from "@/components/TiltCard";
import { MagneticButton } from "@/components/MagneticButton";
import { Highlight } from "@/components/Highlight";
import { WordUp } from "@/components/WordUp";
import { CountUp } from "@/components/CountUp";
import { FeatureDeepDive } from "@/components/FeatureDeepDive";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PhoneFrame } from "@/components/PhoneFrame";
import { AppleLogo, GooglePlayLogo } from "@/components/StoreIcons";
import { APP_URL } from "@/lib/config";

const PROBLEMS = [
  { n: "01", bad: "Scattered money", badsub: "Accounts, cards, loans, investments: spreadsheets go stale.", good: "One truthful picture" },
  { n: "02", bad: "Confusing tax", badsub: "2025/26 rules changed. Most people overpay or guess.", good: "A figure you can defend" },
  { n: "03", bad: "Untrustworthy AI", badsub: "Chatbots hallucinate the numbers that matter most.", good: "AI that never guesses" },
];

const PILLARS = [
  { n: "01", title: "A real ledger", tag: "Double-entry", body: "Proper double-entry accounting under the hood. Immutable, auditable. Every rupee accounted for." },
  { n: "02", title: "A Sri Lankan tax engine", tag: "Deterministic", body: "Relief, rate bands, the 15% foreign-service final tax, and credits, all applied against versioned, CA-reviewed packs." },
  { n: "03", title: "An AI advisor", tag: "Grounded", body: "Reads your statements, explains your tax, and drafts guidance, powered by the ledger and engine, never guesswork." },
  { n: "04", title: "A full money toolkit", tag: "Budgets · FIRE", body: "Budgets, debt payoff, portfolio, insurance, reports and FI projections, all on the same ledger." },
];

const STEPS = [
  { n: "01", title: "Enter your money", body: "Type, speak, or upload statements. Salli drafts; you approve." },
  { n: "02", title: "See your true picture", body: "A live ledger, net worth, and a defensible tax figure." },
  { n: "03", title: "Act with AI guidance", body: "Plan payoffs and goals, and prep your return, grounded in your numbers." },
];

const TRUST = [
  { title: "Deterministic math", body: "Every figure computed by the engine, never AI-generated." },
  { title: "Immutable ledger", body: "Double-entry, auditable, append-only. Nothing quietly changes." },
  { title: "CA-reviewed packs", body: "Versioned tax packs reviewed by a chartered accountant." },
  { title: "Reproducible returns", body: "Recompute a past return years later, even after rates change." },
  { title: "Human checkpoint", body: "A human-review step before any return is finalized." },
  { title: "Your data, private", body: "Everything Salli reads is kept for you, under your control." },
];

const FAQS = [
  { q: "Is Salli's tax figure accurate?", a: "Every figure is produced by a deterministic engine running versioned, chartered-accountant-reviewed tax packs, not by AI. It applies relief, rate bands, foreign-income rules and credits, and records exactly which rules produced the number." },
  { q: "Does the AI calculate my tax?", a: "No. The AI reads documents, explains results, and drafts guidance, but it never computes your money or your tax. The math stays auditable and reproducible in the engine." },
  { q: "Is this financial or investment advice?", a: "No. Salli is not a licensed financial or investment advisor. It gives you tools, clarity, and tax computation, but never personalized investment advice or promised returns." },
  { q: "Which tax year and country does it cover?", a: "Salli launches with the Sri Lanka 2025/26 tax pack, aligned to Inland Revenue rules. Packs are versioned, so past returns stay reproducible even after rates change." },
  { q: "Is my data safe?", a: "Your ledger is immutable and auditable, and everything Salli reads is kept for you, under your control. A human-review checkpoint sits before any return is finalized." },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomePage() {
  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Loader />
      <Header active="/" />

      {/* HERO */}
      <section id="top" className="relative z-2">
        <HeroCanvas />
        <div className="relative z-1 mx-auto max-w-[1320px] px-6 pt-16 pb-10 sm:px-10">
          <div className="absolute right-5 top-10 z-5 hidden sm:block md:right-[280px]">
            <div className="rounded-full bg-red px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[.08em] text-cream shadow-[0_12px_26px_-12px_rgba(245,49,15,.7)]" style={{ transform: "rotate(-7deg)" }}>
              ★ Made for Sri Lanka
            </div>
          </div>
          <div className="grid items-center gap-10 lg:grid-cols-[1.12fr_0.88fr]">
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red">
                Personal finance &amp; tax · 2025/26
              </div>
              <h1 className="mt-5.5 font-display text-[clamp(56px,8.6vw,124px)] font-extrabold leading-[0.9] tracking-[-0.05em]">
                <WordUp delay={0.05}>Stop</WordUp> <WordUp delay={0.13}>guessing.</WordUp>
                <br />
                <WordUp delay={0.24}>Start</WordUp> <WordUp delay={0.34}><Highlight>knowing.</Highlight></WordUp>
              </h1>
              <p className="mt-7.5 max-w-[460px] text-[clamp(17px,1.5vw,21px)] leading-[1.5] text-ink-60">
                A real ledger, a deterministic Sri Lankan tax engine, and an AI advisor that works
                only from your actual numbers, never guesswork.
              </p>
              <div className="mt-9.5 flex flex-wrap gap-3.5">
                <MagneticButton href="#cta" className="rounded-full bg-red px-8 py-4.5 text-[17px] font-bold text-cream shadow-[0_16px_34px_-14px_rgba(245,49,15,.8)]">
                  Get started free
                </MagneticButton>
                <MagneticButton href="#download" className="flex items-center gap-2.5 rounded-full border-2 border-ink px-7.5 py-4 text-[17px] font-bold hover:bg-ink hover:text-cream">
                  <span className="flex items-center gap-1.5">
                    <AppleLogo className="size-4" />
                    <GooglePlayLogo className="size-3.5" />
                  </span>
                  Download the app
                </MagneticButton>
              </div>
              <div className="mt-7.5 flex flex-wrap items-center gap-4 font-mono text-[12.5px] text-ink-50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-green" />CA-reviewed engine
                </span>
                <span className="opacity-40">/</span>
                <span>LKR-native</span>
                <span className="opacity-40">/</span>
                <span>Available on iOS &amp; Android</span>
                <span className="opacity-40">/</span>
                <span>No hallucinated numbers</span>
              </div>
            </div>

            <div className="relative" style={{ perspective: "1200px" }}>
              <div className="absolute -left-7.5 -top-6.5 z-6 hidden sm:block">
                <div className="rounded-full bg-ink px-3.5 py-2.25 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-cream shadow-[0_12px_24px_-12px_rgba(22,19,15,.6)]" style={{ transform: "rotate(6deg)" }}>
                  No guessing ✓
                </div>
              </div>
              <TiltCard className="rounded-[32px] bg-white p-6.5 shadow-[0_40px_80px_-30px_rgba(22,19,15,.5),0_0_0_1px_rgba(22,19,15,.05)]">
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[.1em] text-ink-40">
                  <span className="flex items-center gap-1.75">
                    <span className="flex size-5.5 items-center justify-center rounded-[7px] bg-ink font-display text-xs font-extrabold text-cream">S</span>
                    Salli engine
                  </span>
                  <span className="flex items-center gap-1.5 text-green">
                    <span className="size-1.75 rounded-full bg-green" />Deterministic
                  </span>
                </div>
                <div className="mt-4.5 flex h-[130px] flex-col gap-2">
                  {[
                    ["Payslip · APIT", "−312,000"],
                    ["Foreign fee · 15%", "+840,000"],
                    ["FD interest · AIT", "−48,500"],
                  ].map(([label, amt]) => (
                    <div key={label} className="flex justify-between rounded-[11px] bg-cream-soft px-3.25 py-3 font-mono text-[12.5px]">
                      <span className="text-ink-50">{label}</span>
                      <span>{amt}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 rounded-[20px] bg-ink px-5.5 py-5 text-cream">
                  <div className="font-mono text-[10.5px] uppercase tracking-[.1em] text-ink-40">
                    Tax payable · computed
                  </div>
                  <div className="mt-0.5 font-mono font-display text-[44px] font-extrabold tracking-[-0.02em]">
                    <CountUp target={486000} prefix="LKR " />
                  </div>
                  <div className="mt-3.5 flex items-center gap-2.25 border-t border-cream/16 pt-3.5">
                    <span className="flex size-5.5 items-center justify-center rounded-[7px] bg-red font-display text-xs font-extrabold text-cream">S</span>
                    <span className="text-[12.5px] text-cream-60">
                      Explained by AI (<span className="font-mono font-semibold text-cream">never invented</span>)
                    </span>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <Marquee>
        <MarqueeItem>Salaried professionals</MarqueeItem>
        <MarqueeItem>Freelancers &amp; remote workers</MarqueeItem>
        <MarqueeItem>Foreign-income earners</MarqueeItem>
        <MarqueeItem>Investors &amp; savers</MarqueeItem>
        <MarqueeItem>FIRE planners</MarqueeItem>
      </Marquee>

      {/* PROBLEM -> PROMISE */}
      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-27.5 pb-10 sm:px-10">
        <h2 className="max-w-[720px] font-display text-[clamp(34px,4.4vw,58px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Three problems.
          <br />
          One ledger that <span className="text-red">closes them.</span>
        </h2>
        <div className="mt-14">
          {PROBLEMS.map((p) => (
            <Reveal key={p.n} className="grid grid-cols-[88px_1fr_1fr] items-center gap-6 border-t-2 border-ink py-7.5 transition-[padding] hover:pl-3.5">
              <div className="font-display text-[34px] font-extrabold tracking-[-0.03em] text-red">{p.n}</div>
              <div>
                <div className="font-display text-[clamp(22px,2.2vw,28px)] font-bold tracking-[-0.02em]">{p.bad}</div>
                <div className="mt-1.25 text-[14.5px] text-ink-50">{p.badsub}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display text-[30px] font-extrabold text-red">→</span>
                <div className="font-display text-[clamp(20px,2vw,24px)] font-bold tracking-[-0.01em]">{p.good}</div>
              </div>
            </Reveal>
          ))}
          <div className="border-t-2 border-ink" />
        </div>
      </section>

      {/* ENGINE (inverted) */}
      <section id="engine" className="relative z-2 mt-25 overflow-hidden bg-ink text-cream">
        <EngineCanvas />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-16 -right-10 z-0 hidden font-display text-[clamp(120px,20vw,320px)] font-extrabold leading-none tracking-[-0.06em] whitespace-nowrap text-red/8 lg:block"
        >
          DETERMINISTIC
        </div>
        <div className="relative z-1 mx-auto max-w-[1320px] px-6 py-24 sm:px-10">
          <div className="relative z-1 max-w-[900px]">
            <div className="font-mono text-xs uppercase tracking-[.14em] text-red">The core difference</div>
            <h2 className="mt-5 font-display text-[clamp(40px,6.2vw,86px)] font-extrabold leading-[0.92] tracking-[-0.045em]">
              The AI never
              <br />
              invents your <span className="text-red">numbers.</span>
            </h2>
          </div>
          <div className="relative z-1 mt-17 grid gap-5.5 lg:grid-cols-[1fr_1.15fr_1fr] lg:items-center">
            <div>
              <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[.1em] text-ink-40">01 · Your documents</div>
              <div className="flex flex-col gap-2.5">
                {["Bank statement.pdf", "Payslip · APIT", "FD interest · AIT"].map((line) => (
                  <div key={line} className="rounded-xl border border-cream/12 bg-cream/6 px-3.75 py-3.5 font-mono text-[13px]">
                    {line}
                  </div>
                ))}
              </div>
              <div className="mt-4 text-[13px] text-cream-60">Parsed by AI. Approved by you.</div>
            </div>
            <TiltCard className="rounded-3xl bg-cream p-8 text-ink shadow-[0_40px_80px_-24px_rgba(0,0,0,.6)]">
              <div className="font-mono text-[11px] uppercase tracking-[.1em] text-red">02 · Deterministic engine</div>
              <div className="mt-2 font-display text-[26px] font-extrabold tracking-[-0.02em]">Sri Lankan tax engine</div>
              <div className="mt-4.5 flex flex-col gap-2 font-mono text-xs text-ink-60">
                {[
                  ["Personal relief", "applied"],
                  ["Rate bands 6/18/24%", "applied"],
                  ["Foreign service 15%", "final"],
                  ["APIT · AIT · FTC", "credited"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="text-green">{val}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4.5 border-t-2 border-ink/12 pt-4">
                <div className="font-mono font-display text-[36px] font-extrabold tracking-[-0.02em]">
                  <CountUp target={486000} prefix="LKR " />
                </div>
              </div>
            </TiltCard>
            <div>
              <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[.1em] text-ink-40">03 · Explained by AI</div>
              <div className="rounded-2xl border border-cream/12 bg-cream/6 p-5">
                <div className="text-[15px] leading-[1.55] text-cream-70">
                  &ldquo;Your foreign fees hit the 15% final tax; APIT already covered most of it. You
                  over-withheld by <span className="font-mono font-semibold text-red">LKR 74,000</span>.&rdquo;
                </div>
              </div>
              <div className="mt-4 text-[13px] text-cream-60">
                A number you can defend: every rule recorded, reproducible years later.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section id="pillars" className="relative z-2 mx-auto max-w-[1320px] px-6 pt-27.5 pb-10 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[560px] font-display text-[clamp(34px,4.4vw,58px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
            Four pillars, one
            <br />
            trustworthy ledger.
          </h2>
          <div className="font-mono text-xs uppercase tracking-[.1em] text-ink-40">Index 01 → 04</div>
        </div>
        <div className="mt-13">
          {PILLARS.map((p) => (
            <Reveal key={p.n} className="grid grid-cols-1 items-baseline gap-4 border-t-2 border-ink py-8.5 transition-[padding,background] hover:bg-red/5 hover:pl-3.5 md:grid-cols-[96px_300px_1fr_auto] md:gap-7">
              <div className="font-display text-[34px] font-extrabold tracking-[-0.03em] text-red">{p.n}</div>
              <div className="font-display text-[clamp(24px,2.4vw,30px)] font-bold tracking-[-0.025em]">{p.title}</div>
              <div className="max-w-[540px] text-[15.5px] leading-[1.55] text-ink-60">{p.body}</div>
              <div className="font-mono text-xs uppercase tracking-[.06em] text-ink-40">{p.tag}</div>
            </Reveal>
          ))}
          <div className="border-t-2 border-ink" />
        </div>
      </section>

      {/* FEATURES DEEP DIVES */}
      <section className="relative z-2 mx-auto flex max-w-[1320px] flex-col gap-25 px-6 pt-27.5 pb-10 sm:px-10">
        <FeatureDeepDive
          eyebrow="AI quick-add"
          title={<>Say it.<br />Salli books it.</>}
          body="Type or speak a transaction, and Salli drafts the correct double-entry for you to approve. No accounting degree required."
          visual={
            <TiltCard className="rounded-3xl bg-white p-6 shadow-[0_34px_70px_-30px_rgba(22,19,15,.4),0_0_0_1px_rgba(22,19,15,.05)]">
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
                  <div className="mt-3.25 flex gap-2">
                    <div className="flex-1 rounded-full bg-green py-2.5 text-center text-[13px] font-bold text-cream">Approve</div>
                    <div className="flex-1 rounded-full border border-ink/16 bg-white py-2.5 text-center text-[13px] font-semibold">Edit</div>
                  </div>
                </div>
              </div>
            </TiltCard>
          }
        />

        <FeatureDeepDive
          reverse
          eyebrow="Tax overview &amp; return prep"
          title={<>See exactly<br />what you owe.</>}
          body="Payable, deductions, bands and credits, then a guided return with a human-review checkpoint before you file."
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
          eyebrow="Debt · FIRE · Reports"
          title={<>Plan the next<br />ten years.</>}
          body="Avalanche vs. snowball, years-to-FI, and exportable reports, all on the same trustworthy ledger."
          extra={
            <div className="mt-7.5 flex gap-9">
              <div>
                <div className="font-mono font-display text-[38px] font-extrabold tracking-[-0.02em]">Nov 2029</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[.06em] text-ink-40">Debt-free date</div>
              </div>
              <div className="w-0.5 bg-ink" />
              <div>
                <div className="font-mono font-display text-[38px] font-extrabold tracking-[-0.02em] text-red">
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
                  <div className="font-mono text-[11px] uppercase tracking-[.06em] text-ink-40">FIRE progress</div>
                  <div className="font-display text-[15px] font-bold">14.2 years to go</div>
                </div>
              </div>
            </TiltCard>
          }
        />
      </section>

      {/* MADE FOR SRI LANKA */}
      <section className="relative z-2 mt-27.5 overflow-hidden text-cream">
        <Image
          src="https://images.unsplash.com/photo-1742277295191-9e0349f77ea2?q=80&w=1900&auto=format&fit=crop"
          alt="Lotus Tower, Colombo, Sri Lanka"
          fill
          className="object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-linear-to-b from-ink/72 via-ink/82 to-ink/94" />
        <div className="relative mx-auto max-w-[1320px] px-6 py-30 sm:px-10">
          <div className="font-mono text-xs uppercase tracking-[.14em] text-red">
            Made for Sri Lanka, not bent to fit
          </div>
          <h2 className="mt-4.5 max-w-[680px] font-display text-[clamp(40px,5.6vw,74px)] font-extrabold leading-[0.94] tracking-[-0.045em]">
            Local by design.
            <br />
            From Colombo out.
          </h2>
          <p className="mt-4.5 max-w-[480px] text-[17px] leading-[1.55] text-cream-80">
            Built around IRD rules for 2025/26. LKR-native, aligned to local banks, and reviewed by a
            chartered accountant.
          </p>
          <div className="mt-14 grid grid-cols-2 gap-5.5 md:grid-cols-4">
            {[
              ["2025/26", "IRD tax pack, versioned"],
              ["LKR", "Native currency & local banks"],
              ["15%", "Foreign service final tax"],
              ["CA", "Chartered-accountant reviewed"],
            ].map(([big, label]) => (
              <div key={label} className="border-t-3 border-red pt-5">
                <div className="font-mono font-display text-[clamp(30px,3.4vw,46px)] font-extrabold tracking-[-0.02em]">{big}</div>
                <div className="mt-1.5 text-[13.5px] text-cream-80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-27.5 pb-10 sm:px-10">
        <h2 className="font-display text-[clamp(34px,4.4vw,58px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Three steps to <span className="text-red">knowing.</span>
        </h2>
        <div className="mt-14 grid gap-9 md:grid-cols-3">
          {STEPS.map((s) => (
            <Reveal key={s.n} className="border-t-3 border-ink pt-5.5">
              <div className="font-display text-[56px] font-extrabold leading-none tracking-[-0.04em] text-red">{s.n}</div>
              <div className="mt-3.5 font-display text-[26px] font-bold tracking-[-0.02em]">{s.title}</div>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-60">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SECURITY / TRUST */}
      <section id="security" className="relative z-2 mx-auto max-w-[1320px] px-6 pt-27.5 pb-10 sm:px-10">
        <div className="rounded-[32px] bg-ink px-6 py-18 text-cream sm:px-15">
          <h2 className="max-w-[680px] font-display text-[clamp(34px,4.6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
            Numbers you can defend,
            <br />
            <span className="text-red">years later.</span>
          </h2>
          <div className="mt-13 grid gap-0 md:grid-cols-3">
            {TRUST.map((t) => (
              <div key={t.title} className="border-t border-cream/16 py-7 pr-6.5">
                <div className="font-display text-[19px] font-bold">{t.title}</div>
                <p className="mt-2.25 text-sm leading-[1.55] text-cream-60">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section id="download" className="relative z-2 mx-auto grid max-w-[1320px] items-center gap-15 px-6 pt-27.5 pb-10 sm:px-10 md:grid-cols-2">
        <div>
          <div className="font-mono text-xs uppercase tracking-[.14em] text-red">Platforms</div>
          <h2 className="mt-4 font-display text-[clamp(34px,4.6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
            On your desk.
            <br />
            In your pocket.
          </h2>
          <p className="mt-4.5 max-w-[400px] text-[17px] leading-[1.55] text-ink-60">
            Full-power web app for desktop, and a dedicated dark mobile app for iOS &amp; Android,
            always in sync.
          </p>
          <div className="mt-7.5 flex flex-wrap gap-3">
            <MagneticButton href="#cta" className="flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-[15px] font-bold text-cream hover:bg-red">
              <AppleLogo className="size-4.5" />
              App Store
            </MagneticButton>
            <MagneticButton href="#cta" className="flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-[15px] font-bold text-cream hover:bg-red">
              <GooglePlayLogo className="size-4" />
              Google Play
            </MagneticButton>
            <MagneticButton href={APP_URL} className="rounded-full border-2 border-ink px-5.5 py-3 text-[15px] font-bold hover:bg-ink hover:text-cream">
              Open web app
            </MagneticButton>
          </div>
        </div>
        <div className="flex items-start justify-center gap-5.5">
          <PhoneFrame src="/screens/mobile-home-real.png" alt="Salli mobile app home screen showing net worth, income, expenses, and accounts" width={210} />
          <PhoneFrame src="/screens/mobile-fi-real.png" alt="Salli mobile app Financial Independence screen showing freedom number and years to FI" width={210} className="mt-9" />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-2 mx-auto max-w-[940px] px-6 pt-27.5 pb-10 sm:px-10">
        <h2 className="mb-11 font-display text-[clamp(34px,4.6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Questions,
          <br />
          <span className="text-red">answered.</span>
        </h2>
        <FaqAccordion faqs={FAQS} />
        <p className="mt-7 font-mono text-[11.5px] leading-[1.7] tracking-[.02em] text-ink-40">
          Salli is not a licensed financial or investment advisor. Tools, clarity, and tax
          computation: not personalized investment advice or promised returns.
        </p>
      </section>

      {/* CTA */}
      <section id="cta" className="relative z-2 mx-auto max-w-[1320px] px-6 pt-20 pb-25 sm:px-10">
        <div className="relative overflow-hidden rounded-[36px] bg-red px-6 py-[clamp(64px,9vw,120px)] text-center text-cream">
          <div className="ctaring absolute left-1/2 top-1/2 size-[300px] rounded-full border-2 border-cream/40" />
          <div className="ctaring absolute left-1/2 top-1/2 size-[300px] rounded-full border-2 border-cream/40" style={{ animationDelay: "1.6s" }} />
          <div className="ctaring absolute left-1/2 top-1/2 size-[300px] rounded-full border-2 border-cream/40" style={{ animationDelay: "3.2s" }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-6%] left-1/2 hidden -translate-x-1/2 font-display text-[clamp(140px,26vw,420px)] font-extrabold leading-none tracking-[-0.06em] whitespace-nowrap text-cream/10 lg:block"
          >
            Salli
          </div>
          <div className="relative z-1 font-mono text-xs uppercase tracking-[.14em] opacity-80">
            Get started free · Sri Lanka 2025/26
          </div>
          <h2 className="relative z-1 mt-4.5 font-display text-[clamp(48px,8vw,120px)] font-extrabold leading-[0.9] tracking-[-0.05em]">
            Stop guessing.
            <br />
            Start knowing.
          </h2>
          <div className="relative z-1 mt-11 flex flex-wrap justify-center gap-3.5">
            <MagneticButton href="#top" className="rounded-full bg-cream px-8.5 py-4.5 text-[17px] font-bold text-ink">
              Get started free
            </MagneticButton>
            <MagneticButton href="#download" className="rounded-full border-2 border-cream/60 px-8 py-4 text-[17px] font-bold hover:bg-cream/14">
              Download the app
            </MagneticButton>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
