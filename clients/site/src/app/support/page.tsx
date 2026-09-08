import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircleQuestion, Bug, CreditCard } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";
import { Btn } from "@/components/Btn";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Salli: bugs, billing, tax questions, or anything else.",
  alternates: { canonical: "/support" },
};

const TOPICS = [
  {
    icon: Bug,
    t: "Found a bug?",
    b: "In the app, use Settings and then Report a bug, which attaches the technical details our team needs automatically. Or email us below.",
  },
  {
    icon: CreditCard,
    t: "Billing & subscriptions",
    b: "Questions about your plan, a charge, or cancelling? Email us with the account email you signed up with and we'll sort it out.",
  },
  {
    icon: MessageCircleQuestion,
    t: "How Salli works",
    b: "Tax accuracy, data privacy, and general questions are answered in our FAQ, which is often the fastest route.",
  },
];

export default function SupportPage() {
  return (
    <div className="relative">
      <Header />

      <section className="relative z-2 mx-auto max-w-[900px] px-6 pt-20 pb-10 sm:px-10">
        <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red-ink">
          Support
        </div>
        <h1 className="mt-5 font-display text-[clamp(40px,6.5vw,76px)] font-extrabold leading-[0.95] tracking-[-0.05em]">
          How can we help?
        </h1>
        <p className="mt-6 max-w-[560px] text-[clamp(17px,1.6vw,21px)] leading-[1.55] text-ink-60">
          We&apos;re a small team, but we read every message ourselves. Reach out for anything. a bug, a billing question, or something that just doesn&apos;t make sense.
        </p>
      </section>

      <section className="relative z-2 mx-auto max-w-[900px] px-6 pt-10 pb-10 sm:px-10">
        <Reveal className="rounded-card bg-ink px-6 py-12 text-cream sm:px-14">
          <p className="max-w-[560px] font-display text-[clamp(24px,3vw,36px)] font-bold leading-[1.2] tracking-[-0.02em]">
            We aim to reply within one business day.
          </p>
          <div className="mt-8">
            <Btn href="mailto:hello@leafmonkey.org" variant="ghost" size="lg">
              <Mail size={18} />
              hello@leafmonkey.org
            </Btn>
          </div>
        </Reveal>
      </section>

      <section className="relative z-2 mx-auto max-w-[900px] px-6 pt-15 pb-10 sm:px-10">
        <h2 className="mb-10 font-display text-[clamp(28px,3.6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.04em]">
          Before you write in.
        </h2>
        <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
          {TOPICS.map((topic) => (
            <Reveal
              key={topic.t}
              className="rounded-card border-2 border-ink bg-card p-7 press"
            >
              <topic.icon size={22} className="text-red" strokeWidth={2} />
              <div className="mt-4 font-display text-[18px] font-bold tracking-[-0.02em]">
                {topic.t}
              </div>
              <p className="mt-2 text-sm leading-[1.6] text-ink-50">{topic.b}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-9 text-[14px] text-ink-50">
          More questions answered in our{" "}
          <Link href="/#faq" className="font-semibold text-ink hover:text-red">
            FAQ
          </Link>
          , or read our{" "}
          <Link href="/privacy" className="font-semibold text-ink hover:text-red">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="font-semibold text-ink hover:text-red">
            Terms
          </Link>
          .
        </p>
      </section>

      <Footer />
    </div>
  );
}
