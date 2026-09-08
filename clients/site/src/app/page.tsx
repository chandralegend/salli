import Image from "next/image";
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  LineChart,
  Mic,
  Sparkles,
  GitBranch,
  History,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Marquee, MarqueeItem } from "@/components/Marquee";
import { Reveal } from "@/components/Reveal";
import { Btn } from "@/components/Btn";
import { Highlight } from "@/components/Highlight";
import { Slab } from "@/components/Slab";
import { StickerNote } from "@/components/StickerNote";
import { HeroComposition } from "@/components/HeroComposition";
import { WordUp } from "@/components/WordUp";
import { CountUp } from "@/components/CountUp";
import { FaqAccordion } from "@/components/FaqAccordion";
import { AppShot } from "@/components/AppShot";
import { FreedomChart } from "@/components/FreedomChart";
import { ScoreDial } from "@/components/ScoreDial";
import { BandBars } from "@/components/BandBars";
import { AppleLogo, GooglePlayLogo } from "@/components/StoreIcons";
import {
  APP_LOGIN_URL,
  APP_STORE_URL,
  MOBILE_APP_LIVE,
  PLAY_STORE_URL,
} from "@/lib/config";
import { ComingSoonPill } from "@/components/ComingSoonPill";

const PROBLEMS = [
  {
    n: "01",
    bad: "Scattered money",
    badsub: "Accounts, cards, loans, investments: spreadsheets go stale.",
    good: "One truthful picture",
  },
  {
    n: "02",
    bad: "Confusing tax",
    badsub: "2025/26 rules changed. Most people overpay or guess.",
    good: "A figure you can defend",
  },
  {
    n: "03",
    bad: "Untrustworthy AI",
    badsub: "Chatbots hallucinate the numbers that matter most.",
    good: "AI that never guesses",
  },
];

const STEPS = [
  {
    n: "01",
    tone: "bg-red",
    icon: Mic,
    title: "Enter your money",
    body: "Type, speak, or upload statements. Salli drafts; you approve.",
  },
  {
    n: "02",
    tone: "bg-yellow",
    icon: LineChart,
    title: "See your true picture",
    body: "A live ledger, net worth, and a defensible tax figure.",
  },
  {
    n: "03",
    tone: "bg-ai",
    icon: Sparkles,
    title: "Act with AI guidance",
    body: "Plan payoffs and goals, and prep your return, grounded in your numbers.",
  },
];

const TRUST = [
  {
    icon: Calculator,
    title: "Deterministic math",
    body: "Every figure computed by the engine, never AI-generated.",
  },
  {
    icon: Lock,
    title: "Immutable ledger",
    body: "Double-entry, auditable, append-only. Nothing quietly changes.",
  },
  {
    icon: GitBranch,
    title: "Versioned, tested packs",
    body: "Every rule tested against the IRD's published rate bands and the 2025 Amendment Act.",
  },
  {
    icon: History,
    title: "Reproducible returns",
    body: "Recompute a past return years later, even after rates change.",
  },
  {
    icon: UserCheck,
    title: "Human checkpoint",
    body: "A human-review step before any return is finalized.",
  },
  {
    icon: ShieldCheck,
    title: "Your data, private",
    body: "Everything Salli reads is kept for you, under your control.",
  },
];

const FAQS = [
  {
    q: "Is Salli's tax figure accurate?",
    a: "Every figure is produced by a deterministic engine running versioned, chartered-accountant-reviewed tax packs, not by AI. It applies relief, rate bands, foreign-income rules and credits, and records exactly which rules produced the number.",
  },
  {
    q: "Does the AI calculate my tax?",
    a: "No. The AI reads documents, explains results, and drafts guidance, but it never computes your money or your tax. The math stays auditable and reproducible in the engine.",
  },
  {
    q: "Is this financial or investment advice?",
    a: "No. Salli is not a licensed financial or investment advisor. It gives you tools, clarity, and tax computation, but never personalized investment advice or promised returns.",
  },
  {
    q: "Which tax year and country does it cover?",
    a: "Salli launches with the Sri Lanka 2025/26 tax pack, aligned to Inland Revenue rules. Packs are versioned, so past returns stay reproducible even after rates change.",
  },
  {
    q: "Is my data safe?",
    a: "Your ledger is immutable and auditable, and everything Salli reads is kept for you, under your control. A human-review checkpoint sits before any return is finalized.",
  },
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

/** Small uppercase mono label above a section headline.
 *
 * Rationed on purpose: four on the whole page, one per major movement. The
 * previous version put one above every section, which made nine sections read
 * as nine instances of the same template. */
function Eyebrow({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "muted";
}) {
  return (
    <div
      className={`font-mono text-[11.5px] font-semibold uppercase tracking-[.14em] ${
        tone === "accent" ? "text-red-ink" : "text-red"
      }`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Header active="/" />

      {/* ── HERO ─────────────────────────────────────────────────────────────
          Poster, not a two-column landing block. The headline is the object on
          the page and the second line sits on an extruded orange slab, which is
          the one place the site allows itself real depth. Still four text
          elements: the label row, the headline, the subtext and one button. */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto max-w-[1320px] px-5 pt-8 pb-16 sm:px-8 lg:pt-12">
          <div className="mb-8 flex flex-wrap items-center justify-start gap-3 lg:justify-end">
            <span className="font-mono text-[12px] font-semibold uppercase tracking-[.16em] text-ink-50">
              Sri Lanka 2025/26
            </span>
            <span className="brut-flat rounded-pill px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[.14em]">
              Personal finance &amp; tax
            </span>
          </div>

          <div className="grid items-center gap-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10">
            <div>
              <h1 className="font-display text-[clamp(44px,6.6vw,84px)] font-extrabold leading-[0.94] tracking-[-0.05em]">
                <WordUp delay={0.05}>Stop</WordUp> <WordUp delay={0.13}>guessing.</WordUp>
                <br />
                <WordUp delay={0.26}>
                  <Slab>Start knowing.</Slab>
                </WordUp>
              </h1>

              <p className="mt-8 max-w-[500px] text-[clamp(17px,1.5vw,21px)] leading-[1.45] text-ink-70">
                A real ledger. A deterministic Sri Lankan tax engine. An AI advisor that works
                only from your actual numbers.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Btn href={APP_LOGIN_URL} variant="ai" size="lg" className="slab gap-3 px-8">
                  Get started free
                  <ArrowRight size={19} strokeWidth={2.5} aria-hidden="true" />
                </Btn>
                {MOBILE_APP_LIVE ? (
                  <Btn href="#download" variant="ghost" size="lg">
                    <span className="flex items-center gap-1.5">
                      <AppleLogo className="size-4" />
                      <GooglePlayLogo className="size-3.5" />
                    </span>
                    Download the app
                  </Btn>
                ) : (
                  <ComingSoonPill
                    className="px-6 py-4 text-[16px]"
                    icon={
                      <span className="flex items-center gap-1.5">
                        <AppleLogo className="size-4" />
                        <GooglePlayLogo className="size-3.5" />
                      </span>
                    }
                  >
                    Mobile app
                  </ComingSoonPill>
                )}
              </div>

              <div className="mt-12 font-mono text-[12px] font-semibold uppercase tracking-[.16em] text-ink-50">
                Simple <span className="px-1.5 text-red-ink">·</span> Local{" "}
                <span className="px-1.5 text-red-ink">·</span> Built for real life
              </div>
            </div>

            <div className="hero-rise">
              <HeroComposition />
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IT IS FOR ─────────────────────────────────────────────────── */}
      <Marquee>
        <MarqueeItem>Salaried professionals</MarqueeItem>
        <MarqueeItem>Freelancers &amp; remote workers</MarqueeItem>
        <MarqueeItem>Foreign-income earners</MarqueeItem>
        <MarqueeItem>Investors &amp; savers</MarqueeItem>
        <MarqueeItem>FIRE planners</MarqueeItem>
      </Marquee>

      {/* ── PROBLEM → PROMISE ──────────────────────────────────────────────
          Three stacked blocks rather than hairline rows. Each one is a single
          unit of argument, so each gets its own border. */}
      <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8">
        <h2 className="max-w-[760px] font-display text-[clamp(32px,4.2vw,56px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          Three problems.
          <br />
          One ledger that closes them.
        </h2>
        <div className="mt-14 flex flex-col gap-5">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.06}>
              <div className="brut press grid grid-cols-1 items-center gap-5 bg-card p-6 sm:grid-cols-[64px_1.1fr_1fr] sm:gap-7 sm:p-7">
                <div className="font-display text-[38px] font-extrabold leading-none tracking-[-0.03em] text-red-ink">
                  {p.n}
                </div>
                <div>
                  <div className="font-display text-[clamp(21px,2.1vw,27px)] font-bold tracking-[-0.02em]">
                    {p.bad}
                  </div>
                  <div className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-50">
                    {p.badsub}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-[28px] font-extrabold text-red-ink">
                    →
                  </span>
                  <div className="font-display text-[clamp(19px,1.9vw,23px)] font-bold tracking-[-0.01em]">
                    {p.good}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── THE ENGINE ─────────────────────────────────────────────────────
          The one place the whole argument lives, so it gets the page's only
          full-bleed inverted panel. `on-ink` flips every hard shadow inside it
          to cream, so it reads as the same system in negative. */}
      <section
        id="engine"
        className="on-ink relative mt-24 border-y-2 border-ink bg-ink text-cream"
      >
        <div className="mx-auto max-w-[1320px] px-5 py-24 sm:px-8">
          <div className="max-w-[900px]">
            <h2 className="font-display text-[clamp(38px,5.8vw,80px)] font-extrabold leading-[0.94] tracking-[-0.045em]">
              The AI never invents
              <br />
              your numbers.
            </h2>
            <p className="mt-6 max-w-[540px] text-[17px] leading-[1.55] text-cream-70">
              Documents go in, a deterministic engine does the arithmetic, and
              the AI explains what the engine produced. It never does the sum
              itself.
            </p>
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-[0.85fr_1.1fr_0.95fr] lg:items-stretch">
            <div className="flex flex-col">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[.1em] text-cream-60">
                Your documents
              </div>
              <div className="flex flex-1 flex-col gap-3">
                {[
                  "Bank statement.pdf",
                  "Payslip · APIT",
                  "FD interest · AIT",
                ].map((line) => (
                  <div
                    key={line}
                    className="brut-flat bg-ink-soft px-4 py-3.5 font-mono text-[13px]"
                  >
                    {line}
                  </div>
                ))}
                <div className="mt-auto pt-3 text-[13.5px] text-cream-70">
                  Parsed by AI. Approved by you.
                </div>
              </div>
            </div>

            <div
              className="brut bg-cream p-7 text-ink"
              style={{ ["--brut" as string]: "var(--color-cream)" }}
            >
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[.1em] text-red-ink">
                Deterministic engine
              </div>
              <div className="mt-2 font-display text-[25px] font-extrabold tracking-[-0.02em]">
                Sri Lankan tax engine
              </div>
              <div className="mt-5">
                <BandBars />
              </div>
              <div className="mt-6 border-t-2 border-ink pt-4">
                <div className="font-display text-[clamp(30px,3.4vw,40px)] font-extrabold tracking-[-0.02em]">
                  <CountUp target={486000} prefix="LKR " />
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-[.08em] text-ink-50">
                  Tax payable, computed
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.1em] text-cream-60">
                <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
                Explained by AI
              </div>
              {/* Lavender, because in the app lavender is what the AI says. */}
              <div className="brut bg-ai p-5 text-ink">
                <div className="text-[15px] leading-[1.55]">
                  &ldquo;Your foreign fees hit the 15% final tax; APIT already
                  covered most of it. You over-withheld by{" "}
                  <span className="font-mono font-bold">LKR 74,000</span>
                  .&rdquo;
                </div>
              </div>
              <div className="mt-auto pt-4 text-[13.5px] text-cream-70">
                A number you can defend: every rule recorded, reproducible years
                later.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT IS INSIDE ─────────────────────────────────────────────────
          A four-cell bento with four items in it. Each cell carries a
          different surface so the grid is not four white text boxes. */}
      <section
        id="pillars"
        className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8"
      >
        <h2 className="max-w-[620px] font-display text-[clamp(32px,4.2vw,56px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
          Four pillars, one trustworthy ledger.
        </h2>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          <Reveal className="md:col-span-4">
            <div className="brut press flex h-full flex-col justify-between gap-8 bg-card p-7 sm:p-9">
              <div>
                <div className="font-display text-[clamp(26px,2.8vw,36px)] font-extrabold tracking-[-0.03em]">
                  A real ledger
                </div>
                <p className="mt-3 max-w-[460px] text-[16px] leading-[1.55] text-ink-60">
                  Proper double-entry accounting under the hood. Immutable,
                  auditable. Every rupee accounted for, and a posted entry is
                  never edited away.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 font-mono text-[12px]">
                {["Debit", "Credit", "Reversing entries", "Multi-currency"].map(
                  (t) => (
                    <span
                      key={t}
                      className="brut-flat bg-cream-soft px-3 py-1.5"
                    >
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06} className="md:col-span-2">
            <div className="brut press flex h-full flex-col justify-between bg-red p-7">
              <div>
                <div className="font-display text-[clamp(24px,2.4vw,30px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                  A Sri Lankan tax engine
                </div>
              </div>
              <div>
                <p className="mt-4 text-[15px] leading-[1.5]">
                  Relief, rate bands, the 15% foreign-service final tax and
                  credits, applied against versioned packs.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 font-mono text-[12px]">
                  <span className="brut-flat px-3 py-1.5">Deterministic</span>
                  <span className="brut-flat px-3 py-1.5">Versioned packs</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="md:col-span-2">
            <div className="brut press flex h-full flex-col justify-between bg-ai p-7">
              <div>
                <div className="font-display text-[clamp(24px,2.4vw,30px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                  An AI advisor
                </div>
              </div>
              <div>
                <p className="mt-4 text-[15px] leading-[1.5]">
                  Reads your statements, explains your tax, and drafts guidance,
                  powered by the ledger and engine.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 font-mono text-[12px]">
                  <span className="brut-flat px-3 py-1.5">Grounded</span>
                  <span className="brut-flat px-3 py-1.5">Never computes</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.18} className="md:col-span-4">
            <div className="brut press flex h-full flex-col justify-between gap-7 overflow-hidden bg-ink p-7 text-cream sm:flex-row sm:items-end sm:p-9">
              <div>
                <div className="font-display text-[clamp(26px,2.8vw,36px)] font-extrabold tracking-[-0.03em]">
                  A full money toolkit
                </div>
                <p className="mt-3 max-w-[380px] text-[16px] leading-[1.55] text-cream-70">
                  Budgets, debt payoff, portfolio, insurance, reports and FI
                  projections, all on the same ledger.
                </p>
              </div>
              <AppShot
                src="/screens/app/03-balance.png"
                alt="Salli's balance sheet, listing every account and the net worth they add up to"
                width={150}
                className="on-ink hidden self-end sm:block"
                tilt={3}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURE 1: quick add ───────────────────────────────────────────
          Two split rows follow, and then the pattern breaks. Three in a row is
          the point at which a page stops having sections and starts having a
          template. */}
      <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8">
        <Reveal className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <h3 className="font-display text-[clamp(30px,3.8vw,48px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Say it.
              <br />
              Salli books it.
            </h3>
            <p className="mt-5 max-w-[420px] text-[17px] leading-[1.55] text-ink-60">
              Type or speak a transaction, and Salli drafts the correct
              double-entry for you to approve. No accounting degree required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 font-mono text-[12.5px]">
              {["Type it", "Speak it", "Upload a statement"].map((t) => (
                <span key={t} className="brut bg-card px-4 py-2.5">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <AppShot
              src="/screens/app/02-entry.png"
              alt="Salli's add-entry screen, drafting a double-entry transaction from a plain sentence"
              width={272}
            />
          </div>
        </Reveal>
      </section>

      {/* ── FEATURE 2: ask Salli ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8">
        <Reveal className="grid items-center gap-12 md:grid-cols-2">
          <div className="flex justify-center md:order-1 md:justify-start">
            <AppShot
              src="/screens/app/06-salli-ai.png"
              alt="A conversation with Salli, ranking the top expense categories for the month against the budget"
              width={272}
            />
          </div>
          <div className="md:order-2">
            <h3 className="font-display text-[clamp(30px,3.8vw,48px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
              Ask it anything
              <br />
              about your money.
            </h3>
            <p className="mt-5 max-w-[420px] text-[17px] leading-[1.55] text-ink-60">
              Salli reads your own ledger before it answers, so the figures in
              the reply are the figures in your accounts.
            </p>
            <div className="brut mt-8 max-w-[420px] bg-ai p-5 text-[15px] leading-[1.5]">
              &ldquo;You&rsquo;ve spent 88,700 LKR against a 155,000 LKR limit,
              leaving 66,300 LKR unspent this month.&rdquo;
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── PLAN AHEAD ─────────────────────────────────────────────────────
          Pattern break: a projection, drawn. This was three tiles printing the
          outputs of a calculation; the shape that produces them is the actual
          argument, so the shape is what the section shows now. */}
      <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8">
        <div className="slab bg-cream-soft px-5 py-10 sm:px-10 sm:py-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.62fr] lg:items-end">
            <div>
              <h3 className="max-w-[560px] font-display text-[clamp(30px,3.8vw,48px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
                Plan the next ten years, not just this month.
              </h3>
              <p className="mt-5 max-w-[460px] text-[17px] leading-[1.55] text-ink-60">
                Avalanche against snowball, years to financial independence, and
                exportable reports, all on the same trustworthy ledger.
              </p>
            </div>
            <div className="flex gap-4 lg:justify-end">
              <div className="brut flex-1 bg-yellow p-5 lg:flex-none lg:w-[186px]">
                <div className="font-display text-[clamp(24px,2.4vw,30px)] font-extrabold tracking-[-0.03em] whitespace-nowrap">
                  Nov 2029
                </div>
                <div className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink-60">
                  Debt-free date
                </div>
              </div>
              <div className="brut flex-1 bg-red p-5 lg:flex-none lg:w-[186px]">
                <div className="font-display text-[clamp(24px,2.6vw,32px)] font-extrabold tracking-[-0.03em]">
                  <CountUp target={14.2} decimals={1} suffix=" yrs" />
                </div>
                {/* Full ink: ink-60 measures 2.97:1 against the accent. */}
                <div className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[.08em] text-ink">
                  Years to freedom
                </div>
              </div>
            </div>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-[1fr_0.42fr] lg:items-stretch">
            <FreedomChart />
            <div className="brut flex flex-col items-center justify-center bg-card px-5 py-8">
              <ScoreDial score={61} />
              <p className="mt-5 max-w-[240px] text-center text-[14px] leading-[1.5] text-ink-60">
                Savings rate, debt load and runway, scored together so you can
                see which one is holding the date back.
              </p>
            </div>
          </div>

          <p className="mt-6 font-mono text-[11.5px] leading-[1.6] text-ink-50">
            Example figures from a demo ledger, not a projection of your own.
          </p>
        </div>
      </section>

      {/* ── MADE FOR SRI LANKA ─────────────────────────────────────────────
          The photo now sits in a bordered block beside the copy instead of
          washing out behind it under a gradient scrim. */}
      <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <Eyebrow>Made for Sri Lanka, not bent to fit</Eyebrow>
            <h2 className="mt-5 font-display text-[clamp(34px,4.6vw,64px)] font-extrabold leading-[0.98] tracking-[-0.045em]">
              Local by design.
              <br />
              From Colombo out.
            </h2>
            <p className="mt-5 max-w-[460px] text-[17px] leading-[1.55] text-ink-60">
              Built around IRD rules for 2025/26. LKR-native, aligned to local
              banks, and tested against the IRD&rsquo;s published rate bands.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                ["2025/26", "IRD tax pack, versioned"],
                ["LKR", "Native currency and local banks"],
                ["15%", "Foreign service final tax"],
                ["CA", "Chartered-accountant reviewed"],
              ].map(([big, label]) => (
                <div key={label} className="brut bg-card p-5">
                  <div className="font-display text-[clamp(24px,2.6vw,34px)] font-extrabold tracking-[-0.02em]">
                    {big}
                  </div>
                  <div className="mt-1.5 text-[13.5px] leading-[1.4] text-ink-60">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="brut relative aspect-4/5 overflow-hidden bg-ink">
            <Image
              src="https://images.unsplash.com/photo-1742277295191-9e0349f77ea2?q=80&w=1400&auto=format&fit=crop"
              alt="The Lotus Tower rising over Colombo, Sri Lanka"
              fill
              sizes="(max-width: 1024px) 100vw, 560px"
              className="object-cover object-[center_35%]"
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h2 className="font-display text-[clamp(32px,4.2vw,56px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
            Three steps to <Highlight>knowing.</Highlight>
          </h2>
          <StickerNote tone="ai" tilt={-5} className="hidden md:block">
            No accounting degree needed
          </StickerNote>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="brut press h-full bg-card p-7">
                <div className="flex items-center gap-3">
                  <div className={`brut-flat inline-flex size-12 items-center justify-center ${s.tone} font-display text-[20px] font-extrabold`}>
                    {s.n}
                  </div>
                  {/* The chevron carries the sequence across the three cards.
                      Hidden on the last one and on mobile, where the cards
                      stack and the order is already unambiguous. */}
                  {i < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="hidden flex-1 items-center gap-1.5 md:flex"
                    >
                      <span className="h-0.5 flex-1 bg-ink/15" />
                      <ChevronRight
                        size={16}
                        strokeWidth={3}
                        className="text-ink/30"
                      />
                    </span>
                  ) : null}
                  <s.icon
                    size={20}
                    strokeWidth={2}
                    className="ml-auto text-ink-50"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-5 font-display text-[24px] font-bold tracking-[-0.02em]">
                  {s.title}
                </div>
                <p className="mt-2.5 text-[15px] leading-[1.55] text-ink-60">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TRUST ──────────────────────────────────────────────────────────── */}
      <section
        id="security"
        className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8"
      >
        <div className="on-ink slab bg-ink px-6 py-14 text-cream sm:px-12 sm:py-16">
          <h2 className="max-w-[700px] font-display text-[clamp(32px,4.4vw,58px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
            Numbers you can defend, years later.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TRUST.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.05}>
                <div className="brut-flat h-full bg-ink-soft p-6">
                  {/* The icon is the only thing that differentiates six blocks of
                    the same shape at a glance. One family, one stroke weight. */}
                  <div className="brut-flat mb-4 inline-flex size-11 items-center justify-center bg-ink">
                    <t.icon size={21} strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="font-display text-[18px] font-bold">
                    {t.title}
                  </div>
                  <p className="mt-2.5 text-[14.5px] leading-[1.55] text-cream-70">
                    {t.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ──────────────────────────────────────────────────────── */}
      <section
        id="download"
        className="mx-auto max-w-[1320px] px-5 pt-24 sm:px-8"
      >
        <div className="grid items-center gap-14 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-[clamp(32px,4.4vw,58px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
              On your desk.
              <br />
              In your pocket.
            </h2>
            <p className="mt-5 max-w-[400px] text-[17px] leading-[1.55] text-ink-60">
              {MOBILE_APP_LIVE
                ? "Full-power web app for desktop, and a dedicated mobile app for iOS and Android, always in sync."
                : "The full-power web app works today on desktop and mobile browsers. Dedicated iOS and Android apps are on the way."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {MOBILE_APP_LIVE ? (
                <>
                  <Btn href={APP_STORE_URL}>
                    <AppleLogo className="size-4.5" />
                    App Store
                  </Btn>
                  <Btn href={PLAY_STORE_URL}>
                    <GooglePlayLogo className="size-4" />
                    Google Play
                  </Btn>
                </>
              ) : (
                <>
                  <ComingSoonPill icon={<AppleLogo className="size-4.5" />}>
                    App Store
                  </ComingSoonPill>
                  <ComingSoonPill icon={<GooglePlayLogo className="size-4" />}>
                    Google Play
                  </ComingSoonPill>
                </>
              )}
              <Btn href={APP_LOGIN_URL} variant="ghost">
                Open web app
              </Btn>
            </div>
          </div>
          {/* Overlapped rather than side by side, so the row reads as one
              object and does not repeat the two-column rhythm above it. */}
          <div className="flex items-start justify-center gap-0 md:justify-end">
            <AppShot
              src="/screens/app/01-home.png"
              alt="Salli's home screen showing net worth, what is left to spend this month, and the Freedom score"
              width={228}
              className="relative z-10"
              tilt={-3}
            />
            <AppShot
              src="/screens/app/05-freedom.png"
              alt="Salli's Freedom screen showing the Freedom score and years to financial independence"
              width={228}
              className="-ml-10 mt-12"
              tilt={3}
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-[940px] px-5 pt-24 sm:px-8">
        <h2 className="mb-11 font-display text-[clamp(32px,4.4vw,58px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Questions, answered.
        </h2>
        <FaqAccordion faqs={FAQS} />
        <p className="mt-7 font-mono text-[11.5px] leading-[1.7] tracking-[.02em] text-ink-50">
          Salli is not a licensed financial or investment advisor. Tools,
          clarity, and tax computation: not personalized investment advice or
          promised returns.
        </p>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section
        id="cta"
        className="mx-auto max-w-[1320px] px-5 pt-20 pb-24 sm:px-8"
      >
        <div className="slab relative overflow-hidden bg-red px-6 py-[clamp(56px,8vw,104px)] text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[-14%] left-1/2 hidden -translate-x-1/2 font-display text-[clamp(140px,26vw,400px)] font-extrabold leading-none tracking-[-0.06em] whitespace-nowrap text-ink/6 lg:block"
          >
            Salli
          </div>
          <h2 className="relative z-1 font-display text-[clamp(42px,7.2vw,104px)] font-extrabold leading-[0.92] tracking-[-0.05em]">
            Stop guessing.
            <br />
            Start knowing.
          </h2>
          <div className="relative z-1 mt-10 flex flex-wrap justify-center gap-4">
            <Btn href={APP_LOGIN_URL} variant="ai" size="lg" className="slab gap-3 px-8">
              Get started free
              <ArrowRight size={19} strokeWidth={2.5} aria-hidden="true" />
            </Btn>
            {MOBILE_APP_LIVE ? (
              <Btn href="#download" variant="ghost" size="lg">
                Download the app
              </Btn>
            ) : (
              <ComingSoonPill className="px-7 py-4 text-[17px]">
                Mobile app
              </ComingSoonPill>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
