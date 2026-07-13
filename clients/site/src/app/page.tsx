import Image from "next/image";
import {
  BookOpen, Calculator, Bot, Compass, FileText, ShieldCheck,
  ArrowRight, Check, TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { FadeIn } from "@/components/ui/fade-in";
import { FiScoreCard } from "@/components/FiScoreCard";
import { Spotlight } from "@/components/ui/spotlight";
import { GridBackground } from "@/components/ui/grid-bg";
import { BentoGrid, BentoCard } from "@/components/ui/bento";
import { Marquee } from "@/components/ui/marquee";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Sparkline } from "@/components/ui/sparkline";
import { CometCard } from "@/components/ui/comet-card";
import { AnimatedTestimonials, type Testimonial } from "@/components/ui/animated-testimonials";
import { ContainerScroll } from "@/components/ui/container-scroll";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { StoreBadges } from "@/components/ui/store-badges";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.salli.lk";

const FEATURES = [
  { icon: BookOpen, tile: "mint" as const, span: "md:col-span-2", title: "Double-entry ledger", body: "Every rupee accounted for. Proper bookkeeping that balances — not a spreadsheet that quietly drifts out of sync." },
  { icon: Calculator, tile: "card" as const, span: "", title: "Sri Lanka tax engine", body: "Deterministic income-tax for YA 2025/26 — bands, reliefs, APIT/AIT credits, FSI. IRD-aligned, never guessed." },
  { icon: Bot, tile: "card" as const, span: "", title: "AI agent on your ledger", body: "Ask about your tax or spending. It pulls real numbers from your books — it doesn't invent them." },
  { icon: Compass, tile: "lime" as const, span: "md:col-span-2", title: "Financial Independence score", body: "A FIRE-based 0–100 score from your savings rate, net worth, and goals — with your projected freedom date." },
  { icon: FileText, tile: "card" as const, span: "", title: "Statement parsing", body: "Drop in a bank statement; Salli extracts and classifies transactions for you to review and post." },
  { icon: ShieldCheck, tile: "teal" as const, span: "", title: "Your data, your control", body: "Money is computed on a deterministic engine — the AI never does the arithmetic on your figures." },
];

const TRUST = ["YA 2025/26", "IRD-aligned", "FIRE methodology", "Double-entry accounting", "Deterministic tax engine", "Your data, your database", "4% rule", "Daily wealth advisor"];

const SCREENS = [
  {
    src: "/screens/web-ledger.webp",
    eyebrow: "Ledger",
    title: "Every account, balanced automatically.",
    body: "Proper double-entry bookkeeping — every posting balanced. Search, filter, and drill into any transaction across your full chart of accounts.",
  },
  {
    src: "/screens/web-tax.webp",
    eyebrow: "Tax engine",
    title: "Your tax, broken down and explained",
    body: "Gross income, reliefs, progressive bands, APIT/AIT/FTC credits — computed deterministically and laid out so you can see exactly how the number was reached.",
  },
];

const MOBILE_SCREENS = [
  { src: "/screens/mobile-dashboard.webp", alt: "Salli mobile — Overview dashboard" },
  { src: "/screens/mobile-tax.webp", alt: "Salli mobile — Tax breakdown" },
  { src: "/screens/mobile-fi.webp", alt: "Salli mobile — Financial Independence" },
];

const TESTIMONIALS: Testimonial[] = [
  { quote: "I finally stopped dreading April. Salli worked out my APIT and FSI credits exactly the way my accountant did — in seconds.", name: "Dileepa Fernando", designation: "Freelance developer · Colombo", initials: "DF", gradient: "linear-gradient(140deg, #E8FC85, #A5FFB9)" },
  { quote: "It showed me I was three years from coast-FIRE without changing a thing. That one number reframed how I think about every purchase.", name: "Anjana Perera", designation: "Product designer · Kandy", initials: "AP", gradient: "linear-gradient(140deg, #D5E9EA, #E8FC85)" },
  { quote: "Two foreign-currency accounts, rental income, a side business — Salli reconciled all of it into one clean ledger I actually trust.", name: "Nuwan Jayasuriya", designation: "SME owner · Galle", initials: "NJ", gradient: "linear-gradient(140deg, #A5FFB9, #D5E9EA)" },
  { quote: "The advisor told me to top up my emergency fund first, then move idle cash into a fixed deposit. Simple, specific, and mine.", name: "Hashini Silva", designation: "Doctor · Negombo", initials: "HS", gradient: "linear-gradient(140deg, #E8FC85, #D5E9EA)" },
];

const PLANS = [
  { name: "Free", price: "$0", note: "To get started", features: ["Ledger & tax engine", "20 AI messages / mo", "3 statement uploads / mo", "3 advisor runs / mo"], cta: "Start free", highlight: false },
  { name: "Plus", price: "$9", note: "per month", features: ["Everything in Free", "500 AI messages / mo", "50 statement uploads / mo", "Daily wealth advisor"], cta: "Start free trial", highlight: true },
  { name: "Pro", price: "$29", note: "per month", features: ["Everything in Plus", "5,000 AI messages / mo", "500 statement uploads / mo", "Priority model access"], cta: "Start free trial", highlight: false },
];

function chipClasses(tone: string) {
  return tone === "card"
    ? { box: "bg-[#E8FC85]", icon: "text-[#010001]" }
    : { box: "bg-[#010001]", icon: "text-[#E8FC85]" };
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />

      {/* ── Hero: bento dashboard ───────────────────────────────────────── */}
      <section id="top" className="relative brand-wash overflow-hidden">
        <Spotlight />
        <div className="relative max-w-6xl mx-auto px-5 pt-28 pb-16 sm:pt-36 sm:pb-24">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-foreground/75 bg-white/5 rounded-full pl-2.5 pr-3.5 py-1.5 ring-1 ring-white/10">
              <span className="size-1.5 rounded-full bg-[#A5FFB9] animate-pulse" />
              Personal finance &amp; tax · Sri Lanka
            </span>
            <h1 className="t-display mt-6 text-foreground">
              Stop guessing.{" "}
              <span className="block sm:inline">
                Start{" "}
                <span className="relative inline-block">
                  <span className="absolute inset-x-[-0.12em] inset-y-[0.08em] bg-[#E8FC85] rounded-md origin-left" style={{ animation: "hl-sweep 0.7s 0.45s cubic-bezier(0.16,1,0.3,1) both" }} />
                  <span className="relative text-[#010001]">knowing</span>
                </span>
                .
              </span>
            </h1>
            <p className="t-lead mt-7 max-w-xl mx-auto text-muted-foreground">
              A real ledger, a Sri&nbsp;Lanka tax engine, and an AI advisor that works from
              your actual numbers — so you always know your tax, your net worth, and how
              close you are to freedom.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
              <a href={`${APP}/signup`} className="inline-flex items-center gap-1.5 text-[14px] font-bold px-6 h-12 rounded-full bg-[#E8FC85] text-[#010001] hover:brightness-95 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                Get started free <ArrowRight className="size-4" />
              </a>
              <a href="#features" className="inline-flex items-center text-[14px] font-bold px-6 h-12 rounded-full bg-white/5 text-foreground ring-1 ring-white/12 hover:ring-white/25 hover:-translate-y-0.5 transition-all">
                See how it works
              </a>
            </div>
            <p className="text-[12px] text-muted-foreground/70 mt-4 font-ledger">Free to start · No card required</p>
          </FadeIn>

          {/* Bento preview */}
          <FadeIn delay={0.15} className="mt-14">
            <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[210px] gap-3 sm:gap-4">
              <BentoCard tone="card" className="md:col-span-2 flex flex-col justify-between">
                <div>
                  <p className="t-eyebrow text-[#E8FC85]">Your money, in focus</p>
                  <p className="text-[22px] sm:text-[25px] font-black tracking-[-0.03em] leading-[1.12] mt-3 text-foreground">
                    One ledger that answers your tax, your wealth, and your path to FIRE — live.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  {[
                    { v: 100, suffix: "%", note: "engine-computed" },
                    { v: 6, suffix: "", note: "tax bands · 25/26" },
                    { v: 18.4, suffix: "%", note: "net worth · YTD", decimals: 1 },
                  ].map((s, i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 px-3 py-2.5">
                      <p className="font-ledger text-[20px] sm:text-[23px] text-[#E8FC85] leading-none">
                        <AnimatedNumber to={s.v} suffix={s.suffix} decimals={s.decimals ?? 0} />
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">{s.note}</p>
                    </div>
                  ))}
                </div>
              </BentoCard>

              <BentoCard tone="lime" glow={false} className="flex flex-col justify-between">
                <p className="t-eyebrow text-[#010001]/55">FI score</p>
                <div>
                  <p className="font-ledger text-[46px] leading-none text-[#010001]">
                    <AnimatedNumber to={62} /><span className="text-[16px] text-[#010001]/45">/100</span>
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-[#010001]/15 overflow-hidden mt-3">
                    <div className="h-full rounded-full bg-[#010001] origin-left" style={{ width: "62%", animation: "hl-sweep 1.1s 0.3s cubic-bezier(0.16,1,0.3,1) both" }} />
                  </div>
                  <p className="text-[11px] font-semibold text-[#010001]/60 mt-2">On track · FI by 2041</p>
                </div>
              </BentoCard>

              <BentoCard tone="card" className="flex flex-col justify-between">
                <p className="t-eyebrow">Tax payable · YA&nbsp;25/26</p>
                <div>
                  <p className="font-ledger text-[28px] sm:text-[31px] leading-none text-foreground">
                    <AnimatedNumber to={248500} prefix="Rs " />
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2">IRD-aligned · after reliefs &amp; credits</p>
                </div>
              </BentoCard>

              <BentoCard tone="card" className="md:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <p className="t-eyebrow">Net worth</p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#A5FFB9]">
                    <TrendingUp className="size-3" /> +18.4%
                  </span>
                </div>
                <Sparkline className="w-full h-14 my-1" color="#A5FFB9" fill="rgba(165,255,185,0.12)" />
                <p className="font-ledger text-[24px] text-foreground">
                  <AnimatedNumber to={9.2} prefix="Rs " decimals={1} suffix="M" />
                </p>
              </BentoCard>

              <BentoCard tone="mint" glow={false} className="flex flex-col justify-between">
                <p className="t-eyebrow text-[#010001]/55">Savings rate</p>
                <div>
                  <p className="font-ledger text-[40px] leading-none text-[#010001]"><AnimatedNumber to={51} suffix="%" /></p>
                  <p className="text-[11px] font-semibold text-[#010001]/60 mt-2">of monthly income, automated</p>
                </div>
              </BentoCard>

              <BentoCard tone="card" className="flex flex-col justify-between">
                <div className="size-9 rounded-xl bg-[#E8FC85] flex items-center justify-center">
                  <Bot className="size-5 text-[#010001]" />
                </div>
                <div>
                  <p className="t-tile-title text-foreground">Ask anything about your money</p>
                  <div className="mt-2.5 text-[11px] text-muted-foreground bg-white/5 rounded-full px-3 py-1.5 ring-1 ring-white/10">
                    &ldquo;Am I on track for FIRE?&rdquo;
                  </div>
                </div>
              </BentoCard>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Dashboard preview (real screenshot) ──────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-6 pb-20 sm:pb-28">
        <ContainerScroll
          titleComponent={
            <>
              <p className="t-eyebrow">Dashboard</p>
              <h2 className="t-h2 mt-3 text-foreground">Everything, in one view.</h2>
              <p className="t-lead mt-4 max-w-lg mx-auto text-muted-foreground">
                Net worth, income, tax payable, your FI score — updated the moment you post an entry.
              </p>
            </>
          }
        >
          <Image
            src="/screens/web-dashboard.webp"
            alt="Salli web dashboard — Overview with Net Worth, Income, Tax Payable, and FI Score"
            width={1600}
            height={1000}
            className="w-full h-auto"
            priority
          />
        </ContainerScroll>
      </section>

      {/* ── Trust marquee ───────────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/40 py-4">
        <Marquee speed={36}>
          {TRUST.map((t) => (
            <span key={t} className="inline-flex items-center gap-3 text-[13px] font-ledger text-muted-foreground whitespace-nowrap">
              {t} <span className="text-[#E8FC85] text-[10px]">●</span>
            </span>
          ))}
        </Marquee>
      </section>

      {/* ── Features bento ──────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 sm:py-28">
        <FadeIn className="max-w-2xl">
          <p className="t-eyebrow">What&apos;s inside</p>
          <h2 className="t-h2 mt-3 text-foreground">One ledger. Every answer.</h2>
          <p className="t-lead mt-4 text-muted-foreground">
            Salli keeps proper books, computes your Sri Lanka income tax deterministically,
            and turns the result into clear, actionable guidance.
          </p>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-10">
          <BentoGrid className="md:auto-rows-[minmax(190px,1fr)]">
            {FEATURES.map((f) => {
              const chip = chipClasses(f.tile);
              return (
                <BentoCard key={f.title} tone={f.tile} className={f.span}>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${chip.box}`}>
                    <f.icon className={`size-5 ${chip.icon}`} strokeWidth={2} />
                  </div>
                  <h3 className="t-tile-title mt-5">{f.title}</h3>
                  <p className={`t-body mt-2 ${f.tile === "card" ? "text-muted-foreground" : "text-[#010001]/70"}`}>
                    {f.body}
                  </p>
                </BentoCard>
              );
            })}
          </BentoGrid>
        </FadeIn>
      </section>

      {/* ── Screens: product walkthrough ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20 sm:py-28 space-y-20 sm:space-y-28">
        {SCREENS.map((s, i) => (
          <FadeIn key={s.title} className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <p className="t-eyebrow">{s.eyebrow}</p>
              <h2 className="t-h2 mt-3 text-foreground">{s.title}</h2>
              <p className="t-lead mt-4 text-muted-foreground max-w-md">{s.body}</p>
            </div>
            <div className="rounded-2xl overflow-hidden ring-1 ring-white/12 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]">
              <Image src={s.src} alt={s.title} width={1600} height={1000} className="w-full h-auto" />
            </div>
          </FadeIn>
        ))}
      </section>

      {/* ── FI deep-dive (vault) ────────────────────────────────────────── */}
      <section className="relative brand-vault text-ink-foreground overflow-hidden">
        <GridBackground />
        <div className="relative max-w-6xl mx-auto px-5 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <p className="t-eyebrow text-[#E8FC85]">Financial Independence</p>
            <h2 className="t-h2 mt-4 text-foreground">Know exactly how close you are to freedom.</h2>
            <p className="t-lead mt-5 text-muted-foreground max-w-md">
              Salli scores your finances against the 4% rule and proven money principles,
              then a daily wealth advisor tells you the next move — top up your emergency
              fund, park idle cash in a fixed deposit, automate investing.
            </p>
            <div className="flex flex-wrap gap-x-9 gap-y-4 mt-8">
              <div>
                <p className="font-ledger text-[30px] text-[#E8FC85] leading-none"><AnimatedNumber to={4} suffix="%" /></p>
                <p className="text-[12px] text-muted-foreground mt-1.5">Safe withdrawal rate</p>
              </div>
              <div>
                <p className="font-ledger text-[30px] text-[#E8FC85] leading-none"><AnimatedNumber to={2041} /></p>
                <p className="text-[12px] text-muted-foreground mt-1.5">Your projected FI year</p>
              </div>
              <div>
                <p className="font-ledger text-[30px] text-[#E8FC85] leading-none"><AnimatedNumber to={51} suffix="%" /></p>
                <p className="text-[12px] text-muted-foreground mt-1.5">Current savings rate</p>
              </div>
            </div>
            <a href={`${APP}/signup`} className="inline-flex items-center gap-1.5 text-[14px] font-bold px-6 h-12 rounded-full bg-[#E8FC85] text-[#010001] hover:brightness-95 hover:-translate-y-0.5 transition-all mt-9">
              Check your FI score <ArrowRight className="size-4" />
            </a>
          </FadeIn>
          <FiScoreCard />
        </div>
      </section>

      {/* ── Mobile app: coming soon ──────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn className="order-2 lg:order-1">
            <p className="t-eyebrow">Mobile</p>
            <h2 className="t-h2 mt-3 text-foreground">Your numbers, in your pocket.</h2>
            <p className="t-lead mt-4 text-muted-foreground max-w-md">
              The same ledger, tax engine, and FI score — redesigned for iOS and Android.
              We&apos;re polishing the last details before launch.
            </p>
            <StoreBadges className="mt-8" />
          </FadeIn>
          <FadeIn delay={0.1} className="order-1 lg:order-2 flex justify-center items-end">
            <div className="flex items-end sm:-space-x-8 lg:-space-x-10">
              <div className="hidden sm:block rotate-[-8deg] translate-y-4">
                <PhoneFrame src={MOBILE_SCREENS[1].src} alt={MOBILE_SCREENS[1].alt} className="w-[150px] lg:w-[190px]" />
              </div>
              <div className="z-10 sm:-translate-y-2">
                <PhoneFrame src={MOBILE_SCREENS[0].src} alt={MOBILE_SCREENS[0].alt} className="w-[210px] sm:w-[180px] lg:w-[250px]" priority />
              </div>
              <div className="hidden sm:block rotate-[8deg] translate-y-4">
                <PhoneFrame src={MOBILE_SCREENS[2].src} alt={MOBILE_SCREENS[2].alt} className="w-[150px] lg:w-[190px]" />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20 sm:py-28">
        <FadeIn className="max-w-2xl">
          <p className="t-eyebrow">Trusted by</p>
          <h2 className="t-h2 mt-3 text-foreground">People building their freedom.</h2>
        </FadeIn>
        <FadeIn delay={0.1} className="mt-12">
          <AnimatedTestimonials testimonials={TESTIMONIALS} autoplay />
        </FadeIn>
      </section>

      {/* ── Pricing (comet cards) ───────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 py-20 sm:py-28">
        <FadeIn className="text-center max-w-xl mx-auto">
          <p className="t-eyebrow">Pricing</p>
          <h2 className="t-h2 mt-3 text-foreground">Simple, honest pricing</h2>
          <p className="t-lead mt-4 text-muted-foreground">
            Start free. Upgrade when the AI becomes part of your routine. Cancel anytime.
          </p>
        </FadeIn>
        <FadeIn delay={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12 max-w-4xl mx-auto">
          {PLANS.map((p) => (
            <CometCard key={p.name} rotateDepth={9} translateDepth={7} className={p.highlight ? "md:-mt-3" : ""}>
              <div className={`h-full flex flex-col rounded-[26px] p-6 sm:p-7 bg-card ${p.highlight ? "ring-2 ring-[#E8FC85]/55 shadow-[0_30px_70px_-30px_rgba(232,252,133,0.35)]" : "ring-1 ring-white/10"}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-foreground">{p.name}</h3>
                  {p.highlight && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#010001] bg-[#E8FC85] rounded-full px-2.5 py-1">Popular</span>
                  )}
                </div>
                <p className="font-ledger text-[36px] mt-3 text-foreground">
                  {p.price}<span className="text-[13px] font-sans text-muted-foreground"> · {p.note}</span>
                </p>
                <ul className="space-y-2.5 mt-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-foreground/85">
                      <Check className="size-3.5 shrink-0 mt-0.5 text-[#E8FC85]" /> {f}
                    </li>
                  ))}
                </ul>
                <a href={`${APP}/signup`} className={`mt-7 inline-flex items-center justify-center text-[13px] font-bold h-11 rounded-full transition-all ${p.highlight ? "bg-[#E8FC85] text-[#010001] hover:brightness-95" : "bg-white/5 text-foreground ring-1 ring-white/12 hover:ring-white/25"}`}>
                  {p.cta}
                </a>
              </div>
            </CometCard>
          ))}
        </FadeIn>
      </section>

      {/* ── Final CTA panel ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-24 sm:pb-32">
        <CometCard rotateDepth={6} translateDepth={5}>
          <div className="relative overflow-hidden rounded-[32px] bg-[#0C0E0B] ring-1 ring-[#E8FC85]/15 px-6 py-20 sm:py-24 text-center shadow-[0_40px_120px_-50px_rgba(232,252,133,0.4)]">
            <GridBackground />
            <Spotlight />
            <div className="relative">
              <h2 className="t-display text-foreground">Stop guessing.<br />Start building freedom.</h2>
              <p className="t-lead mt-6 max-w-md mx-auto text-muted-foreground">
                Take control of your money, your tax, and your path to financial independence.
              </p>
              <a href={`${APP}/signup`} className="inline-flex items-center gap-1.5 text-[14px] font-bold px-7 h-12 rounded-full bg-[#E8FC85] text-[#010001] hover:brightness-95 hover:-translate-y-0.5 transition-all mt-9">
                Get started free <ArrowRight className="size-4" />
              </a>
              <p className="text-[12px] text-muted-foreground/70 mt-4 font-ledger">Free to start · No card required</p>
            </div>
          </div>
        </CometCard>
      </section>

      <SiteFooter />
    </main>
  );
}
