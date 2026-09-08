import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Slab } from "@/components/Slab";
import { Footer } from "@/components/Footer";
import { WordUp } from "@/components/WordUp";
import { BlogList } from "@/components/BlogList";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Straight-talking guides on Sri Lankan tax, everyday money, and building wealth, no jargon, no guesswork.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="relative">
      <Header active="/blog" />

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-20 pb-5 sm:px-10">
        <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red-ink">
          The Salli Ledger · Blog
        </div>
        <h1 className="mt-5.5 max-w-[1000px] font-display text-[clamp(46px,7.6vw,108px)] font-extrabold leading-[0.9] tracking-[-0.05em]">
          <WordUp delay={0.05}>Money,</WordUp> <WordUp delay={0.13}>tax</WordUp> <WordUp delay={0.2}>&amp;</WordUp>{" "}
          <WordUp delay={0.28}>clarity</WordUp> <WordUp delay={0.38}><Slab>plainly.</Slab></WordUp>
        </h1>
        <p className="mt-6.5 max-w-[520px] text-[clamp(17px,1.5vw,20px)] leading-[1.5] text-ink-60">
          Straight-talking guides on Sri Lankan tax, everyday money, and building wealth, no
          jargon, no guesswork.
        </p>
      </section>

      {featured && <BlogList featured={featured} posts={rest} />}

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-5 pb-25 sm:px-10">
        <div className="rounded-card bg-red px-6 py-[clamp(48px,6vw,84px)] text-center text-ink">
          <h2 className="font-display text-[clamp(32px,5vw,64px)] font-extrabold leading-[0.96] tracking-[-0.04em]">
            Get the ledger, monthly.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[16.5px] text-ink/85">
            One clear email a month on Sri Lankan money and tax. No spam, no hype, and unsubscribe
            anytime.
          </p>
          <form className="mt-7.5 flex flex-wrap justify-center gap-2.5">
            <input
              type="email"
              placeholder="you@email.lk"
              className="min-w-[280px] rounded-full border-none bg-cream px-5.5 py-4 font-mono text-[15px] text-ink outline-none"
            />
            <button type="submit" className="rounded-full bg-ink px-7.5 py-4 text-base font-bold text-cream">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
