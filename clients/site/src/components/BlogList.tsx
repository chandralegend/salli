"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Reveal } from "@/components/Reveal";
import { COVER_STYLE_CLASS, type CoverStyle } from "@/lib/blog-styles";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedDate: string;
  readTime: string;
  coverStyle: string;
};

const CATEGORIES = ["All", "Tax", "Money basics", "Foreign income", "FIRE", "Product"];

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function BlogList({ featured, posts }: { featured: Post; posts: Post[] }) {
  const [category, setCategory] = useState("All");
  const filtered = category === "All" ? posts : posts.filter((p) => p.category === category);

  return (
    <>
      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-9 pb-2.5 sm:px-10">
        <div className="flex flex-wrap gap-2.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={clsx(
                "rounded-full border-1.5 px-4.5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[.04em] transition-colors",
                c === category ? "border-ink bg-ink text-cream" : "border-ink/18 text-ink-50 hover:border-ink/40",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-7.5 pb-10 sm:px-10">
        <Link
          href={`/blog/${featured.slug}`}
          className="grid overflow-hidden rounded-[28px] bg-ink text-cream shadow-[0_34px_70px_-34px_rgba(22,19,15,.5)] transition-transform hover:-translate-y-1 md:grid-cols-[1.1fr_1fr]"
        >
          <div className="flex flex-col justify-center p-8 sm:p-13">
            <div className="font-mono text-[11px] uppercase tracking-[.1em] text-red">
              Featured · {featured.category}
            </div>
            <h2 className="mt-4 font-display text-[clamp(28px,3.4vw,46px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              {featured.title}
            </h2>
            <p className="mt-4 max-w-[440px] text-[15.5px] leading-[1.6] text-cream-60">{featured.excerpt}</p>
            <div className="mt-6 flex items-center gap-3.5 font-mono text-xs text-ink-40">
              <span>{formatDate(featured.publishedDate)}</span>
              <span className="opacity-40">/</span>
              <span>{featured.readTime}</span>
            </div>
            <div className="mt-5.5 inline-block w-fit rounded-full bg-red px-6 py-3.25 text-sm font-bold text-cream">
              Read article →
            </div>
          </div>
          <div className={clsx("flex min-h-[280px] items-center justify-center", COVER_STYLE_CLASS[featured.coverStyle as CoverStyle])}>
            <div className="font-display text-[clamp(120px,16vw,260px)] font-extrabold tracking-[-0.05em] text-cream/14">
              2026
            </div>
          </div>
        </Link>
      </section>

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pb-10 sm:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {filtered.map((p, i) => (
            <Reveal key={p.slug} delay={0.04 * (i % 3)}>
              <Link
                href={`/blog/${p.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-[22px] border border-ink/7 bg-white shadow-[0_20px_50px_-36px_rgba(22,19,15,.35)] transition-transform hover:-translate-y-1.5"
              >
                <div className={clsx("relative flex aspect-16/10 items-end p-4.5", COVER_STYLE_CLASS[p.coverStyle as CoverStyle])}>
                  <span className="rounded-full bg-cream/90 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink">
                    {p.category}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-[21px] font-bold leading-[1.1] tracking-[-0.02em]">{p.title}</h3>
                  <p className="mt-2.5 flex-1 text-sm leading-[1.55] text-ink-50">{p.excerpt}</p>
                  <div className="mt-4.5 flex items-center gap-3 font-mono text-[11.5px] text-ink-40">
                    <span>{formatDate(p.publishedDate)}</span>
                    <span className="opacity-40">/</span>
                    <span>{p.readTime}</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
