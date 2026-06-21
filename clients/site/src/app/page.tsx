import {
  BookOpen, Calculator, Bot, Compass, FileText, ShieldCheck,
  ArrowRight, Check,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { Reveal } from "@/components/Reveal";
import { FiScoreCard } from "@/components/FiScoreCard";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.salli.lk";

function Logo({ className = "size-8" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/salli-logo.png" alt="Salli" width={256} height={256}
    className={`${className} rounded-lg object-cover`} />;
}

const FEATURES = [
  { icon: BookOpen, title: "Double-entry ledger", body: "Every rupee accounted for. Proper bookkeeping that balances — not a spreadsheet that drifts." },
  { icon: Calculator, title: "Sri Lanka tax engine", body: "Deterministic income-tax computation for YA 2025/26 — bands, reliefs, APIT/AIT credits, FSI. IRD-aligned, never guessed." },
  { icon: Bot, title: "AI agent that reads your ledger", body: "Ask about your tax position or spending. It pulls real numbers from your books — it doesn't invent them." },
  { icon: Compass, title: "Financial Independence score", body: "A FIRE-based 0–100 score from your real savings rate, net worth, and goals — with your projected FI date." },
  { icon: FileText, title: "Statement parsing", body: "Drop in a bank statement; Salli extracts and classifies transactions for you to review and post." },
  { icon: ShieldCheck, title: "Your data, your control", body: "Figures are computed on a deterministic engine — the AI never processes your numbers to calculate money." },
];

const PLANS = [
  { name: "Free", price: "$0", note: "To get started", features: ["Ledger & tax engine", "20 AI messages / mo", "3 statement uploads / mo", "3 advisor runs / mo"], cta: "Start free", highlight: false },
  { name: "Plus", price: "$9", note: "per month", features: ["Everything in Free", "500 AI messages / mo", "50 statement uploads / mo", "Daily wealth advisor"], cta: "Start free trial", highlight: true },
  { name: "Pro", price: "$29", note: "per month", features: ["Everything in Plus", "5,000 AI messages / mo", "500 statement uploads / mo", "Priority model access"], cta: "Start free trial", highlight: false },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <SiteNav />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section id="top" className="ledger-paper border-b border-border/60">
        <Reveal stagger={0.12} className="max-w-6xl mx-auto px-5 py-24 sm:py-32 text-center">
          <p className="text-secondary-label">Personal finance &amp; tax · Sri Lanka</p>
          <h1 className="font-ledger text-[40px] sm:text-[64px] leading-[1.04] mt-5 text-foreground">
            STOP GUESSING.
            <br />
            START KNOWING.
          </h1>
          <p className="text-[16px] sm:text-[18px] text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed">
            Track your money. Understand your tax. Build your freedom — with a real
            ledger, a Sri Lanka tax engine, and an AI advisor that works from your numbers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
            <a href={`${APP}/signup`} className="inline-flex items-center gap-1.5 text-[14px] font-medium px-5 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Get started free <ArrowRight className="size-4" />
            </a>
            <a href="#features" className="inline-flex items-center text-[14px] font-medium px-5 h-11 rounded-lg ring-1 ring-foreground/15 bg-card hover:ring-foreground/30 transition">
              See how it works
            </a>
          </div>
          <p className="text-[12px] text-muted-foreground/70 mt-4 font-ledger">
            Free to start · No card required
          </p>
        </Reveal>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <section className="border-b border-border/60 bg-card">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] font-ledger text-muted-foreground">
          <span>YA 2025/26</span><span className="opacity-30">·</span>
          <span>IRD-aligned</span><span className="opacity-30">·</span>
          <span>FIRE methodology</span><span className="opacity-30">·</span>
          <span>Your data, your database</span>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 sm:py-28">
        <Reveal className="max-w-2xl">
          <h2 className="text-[28px] sm:text-[34px] font-semibold">One ledger. Every answer.</h2>
          <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
            Salli keeps proper books, computes your tax deterministically, and turns the
            result into clear guidance — so the numbers are trustworthy, not vibes.
          </p>
        </Reveal>
        <Reveal stagger={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl bg-card ring-1 ring-foreground/8 p-5 hover:ring-foreground/15 transition">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <f.icon className="size-4.5 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold mt-4">{f.title}</h3>
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── FI highlight (ledger cover) ─────────────────────────────────── */}
      <section className="ledger-cover text-ink-foreground">
        <div className="max-w-6xl mx-auto px-5 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <p className="text-secondary-label text-ink-foreground/50">Financial Independence</p>
            <h2 className="text-[30px] sm:text-[38px] font-semibold mt-4 leading-tight">
              Know exactly how close you are to freedom.
            </h2>
            <p className="text-[15px] text-ink-foreground/65 mt-4 leading-relaxed max-w-md">
              Salli scores your finances against the 4% rule and proven money principles,
              then a daily wealth advisor tells you the next move — top up your emergency
              fund, park idle cash in a fixed deposit, automate investing.
            </p>
            <a href={`${APP}/signup`} className="inline-flex items-center gap-1.5 text-[14px] font-medium px-5 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-8">
              Check your FI score <ArrowRight className="size-4" />
            </a>
          </Reveal>
          <FiScoreCard />
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 py-20 sm:py-28">
        <Reveal className="text-center max-w-xl mx-auto">
          <h2 className="text-[28px] sm:text-[34px] font-semibold">Simple, honest pricing</h2>
          <p className="text-[15px] text-muted-foreground mt-3">
            Start free. Upgrade when the AI becomes part of your routine. Cancel anytime.
          </p>
        </Reveal>
        <Reveal stagger={0.1} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 max-w-4xl mx-auto">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-2xl p-6 flex flex-col ${p.highlight ? "bg-card ring-2 ring-primary/40 shadow-sm" : "bg-card ring-1 ring-foreground/8"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">{p.name}</h3>
                {p.highlight && <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Popular</span>}
              </div>
              <p className="font-ledger text-[30px] mt-2">
                {p.price}<span className="text-[13px] text-muted-foreground font-sans"> · {p.note}</span>
              </p>
              <ul className="space-y-2 mt-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-foreground/80">
                    <Check className="size-3.5 text-primary shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <a href={`${APP}/signup`} className={`mt-6 inline-flex items-center justify-center text-[13px] font-medium h-10 rounded-lg transition-colors ${p.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "ring-1 ring-foreground/15 hover:ring-foreground/30"}`}>
                {p.cta}
              </a>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="ledger-paper border-t border-border/60">
        <Reveal className="max-w-6xl mx-auto px-5 py-24 text-center">
          <h2 className="font-ledger text-[32px] sm:text-[44px] text-foreground">Stop guessing.</h2>
          <p className="text-[15px] text-muted-foreground mt-3 max-w-md mx-auto">
            Take control of your money, your tax, and your path to financial freedom.
          </p>
          <a href={`${APP}/signup`} className="inline-flex items-center gap-1.5 text-[14px] font-medium px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-8">
            Get started free <ArrowRight className="size-4" />
          </a>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60 bg-card">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo className="size-6" />
            <span className="text-[13px] text-muted-foreground">Salli · Finance &amp; Tax · Sri Lanka</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href={`${APP}/login`} className="hover:text-foreground transition-colors">Sign in</a>
          </div>
          <p className="text-[11px] text-muted-foreground/60 font-ledger">© 2026 Salli</p>
        </div>
      </footer>
    </main>
  );
}
