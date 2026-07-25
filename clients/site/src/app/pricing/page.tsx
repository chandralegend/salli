import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MagneticButton } from "@/components/MagneticButton";
import { Highlight } from "@/components/Highlight";
import { WordUp } from "@/components/WordUp";
import { FaqAccordion } from "@/components/FaqAccordion";
import { PricingTiers } from "@/components/PricingTiers";
import { APP_LOGIN_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free forever, full tax engine and planning included. Upgrade for higher AI usage limits and to connect Claude, ChatGPT, and other AI assistants.",
  alternates: { canonical: "/pricing" },
};

const FAQS = [
  { q: "Is the Free plan really free forever?", a: "Yes. The immutable ledger, the full Sri Lanka tax engine, and debt payoff & FIRE planning stay free forever, no card required. You only pay for higher AI usage limits, the daily wealth advisor, and connecting an external AI assistant like Claude or ChatGPT." },
  { q: "How does annual billing work?", a: "Choose Annual to save 20% versus monthly. You're billed once a year, and you can switch back to monthly or cancel anytime." },
  { q: "Can I change or cancel my plan?", a: "Anytime, from your account. Upgrades apply immediately and downgrades take effect at the end of your current billing period." },
  { q: "Do prices include taxes?", a: "Prices are shown in USD and billed via Paddle, our merchant of record, who applies any VAT, GST, or other local taxes at checkout based on your location." },
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

export default function PricingPage() {
  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Header active="/pricing" />

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-20 pb-5 text-center sm:px-10">
        <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red">
          Pricing · Sri Lanka
        </div>
        <h1 className="mx-auto mt-5.5 max-w-[900px] font-display text-[clamp(48px,8vw,112px)] font-extrabold leading-[0.9] tracking-[-0.05em]">
          <WordUp delay={0.05}>Clarity</WordUp> <WordUp delay={0.14}>has</WordUp> <WordUp delay={0.22}>a</WordUp>{" "}
          <WordUp delay={0.32}><Highlight>fair price.</Highlight></WordUp>
        </h1>
        <p className="mx-auto mt-6.5 max-w-[520px] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-ink-60">
          Start free forever, full tax engine and planning included. Upgrade for higher AI usage
          limits and to connect Claude, ChatGPT and other AI assistants.
        </p>
        <PricingTiers />
      </section>

      <section className="relative z-2 mx-auto max-w-[900px] px-6 pt-20 pb-10 sm:px-10">
        <h2 className="mb-9 font-display text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          Pricing questions.
        </h2>
        <FaqAccordion faqs={FAQS} />
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-15 pb-25 sm:px-10">
        <div className="rounded-[36px] bg-red px-6 py-[clamp(56px,8vw,104px)] text-center text-cream">
          <h2 className="font-display text-[clamp(40px,7vw,96px)] font-extrabold leading-[0.92] tracking-[-0.05em]">
            Try it free.
          </h2>
          <p className="mx-auto mt-4 max-w-[420px] text-[17px] text-cream/90">
            No card required. Upgrade only when Salli is saving you real money.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <MagneticButton href={APP_LOGIN_URL} className="rounded-full bg-cream px-8.5 py-4.5 text-[17px] font-bold text-ink">
              Get started free
            </MagneticButton>
            <MagneticButton href="/features" className="rounded-full border-2 border-cream/60 px-8 py-4 text-[17px] font-bold hover:bg-cream/14">
              Explore features
            </MagneticButton>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
