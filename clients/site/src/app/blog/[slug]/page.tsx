import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdoc from "@markdoc/markdoc";
import React from "react";
import { clsx } from "clsx";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MagneticButton } from "@/components/MagneticButton";
import { SITE_URL as BASE_URL } from "@/lib/config";
import { getAllPosts, getAllSlugs, getPost } from "@/lib/posts";
import { COVER_STYLE_CLASS, type CoverStyle } from "@/lib/blog-styles";

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const url = `${BASE_URL}/blog/${slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url,
      publishedTime: post.publishedDate,
      authors: [post.author],
      tags: [post.category],
      ...(post.coverImage ? { images: [{ url: post.coverImage, alt: post.coverImageAlt || post.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const { node } = await post.content();
  const errors = Markdoc.validate(node);
  if (errors.length) {
    throw new Error(errors.map((e) => e.error.message).join("\n"));
  }
  const renderable = Markdoc.transform(node);

  const allPosts = await getAllPosts();
  const related = allPosts.filter((p) => p.slug !== slug).slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    ...(post.coverImage ? { image: [post.coverImage] } : {}),
    datePublished: post.publishedDate,
    dateModified: post.publishedDate,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Salli",
      logo: { "@type": "ImageObject", url: `${BASE_URL}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${slug}` },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 2, name: post.title, item: `${BASE_URL}/blog/${slug}` },
    ],
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Header active="/blog" />

      <section className="relative z-2 mx-auto max-w-[820px] px-6 pt-16 sm:px-10">
        <div className="flex items-center gap-3 font-mono text-xs text-ink-40">
          <Link href="/blog" className="text-red">
            ← Blog
          </Link>
          <span className="opacity-40">/</span>
          <span className="uppercase tracking-[.08em]">{post.category}</span>
        </div>
        <h1 className="mt-6 font-display text-[clamp(38px,5.4vw,68px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          {post.title}
        </h1>
        <p className="mt-5.5 text-xl leading-[1.5] text-ink-60">{post.excerpt}</p>
        <div className="mt-7.5 flex items-center gap-3.5 border-y border-ink/12 py-5">
          <div className="flex size-11 items-center justify-center rounded-full bg-ink font-display font-extrabold text-cream">
            S
          </div>
          <div>
            <div className="text-[14.5px] font-bold">{post.author}</div>
            <div className="font-mono text-xs text-ink-40">
              {formatDate(post.publishedDate)} · {post.readTime}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[1000px] px-6 pt-8.5 sm:px-10">
        <div
          className={clsx(
            "relative flex aspect-16/7 items-center justify-center overflow-hidden rounded-3xl",
            COVER_STYLE_CLASS[post.coverStyle as CoverStyle],
          )}
        >
          {post.coverImage ? (
            <>
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt || post.title}
                fill
                priority
                className="object-cover"
              />
              <div className={clsx("absolute inset-0 opacity-40", COVER_STYLE_CLASS[post.coverStyle as CoverStyle])} />
            </>
          ) : (
            <div className="font-display text-[clamp(120px,20vw,300px)] font-extrabold tracking-[-0.05em] text-cream/16">
              {post.category}
            </div>
          )}
        </div>
      </section>

      <section className="relative z-2 mx-auto max-w-[720px] px-6 pt-5 pb-10 sm:px-10">
        <div className="article">{Markdoc.renderers.react(renderable, React)}</div>

        <div className="mt-12 flex items-center gap-4 rounded-[22px] border border-ink/8 bg-white p-7">
          <div className="flex size-13 flex-none items-center justify-center rounded-full bg-ink font-display text-xl font-extrabold text-cream">
            S
          </div>
          <div>
            <div className="text-[15px] font-bold">Written by {post.author}</div>
            <p className="mt-1 text-[13.5px] leading-[1.5] text-ink-50">
              We build the honest ledger and deterministic tax engine behind Salli. This article
              is general guidance, not personalised tax advice.
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-17.5 pb-10 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-[clamp(26px,3.4vw,42px)] font-extrabold leading-[1.0] tracking-[-0.03em]">
              Keep reading.
            </h2>
            <Link href="/blog" className="navlink font-mono text-[13px] font-semibold text-red">
              All articles →
            </Link>
          </div>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {related.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="flex flex-col overflow-hidden rounded-[22px] border border-ink/7 bg-white shadow-[0_20px_50px_-36px_rgba(22,19,15,.35)] transition-transform hover:-translate-y-1.5"
              >
                <div className={clsx("relative flex aspect-16/10 items-end overflow-hidden p-4.5", COVER_STYLE_CLASS[p.coverStyle as CoverStyle])}>
                  {p.coverImage && (
                    <Image src={p.coverImage} alt={p.coverImageAlt || p.title} fill className="object-cover" />
                  )}
                  <div className={clsx("absolute inset-0 opacity-55", COVER_STYLE_CLASS[p.coverStyle as CoverStyle])} />
                  <span className="relative z-10 rounded-full bg-cream/90 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[.06em] text-ink">
                    {p.category}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-bold leading-[1.1] tracking-[-0.02em]">{p.title}</h3>
                  <div className="mt-4 flex items-center gap-3 font-mono text-[11.5px] text-ink-40">
                    <span>{formatDate(p.publishedDate)}</span>
                    <span className="opacity-40">/</span>
                    <span>{p.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="relative z-2 mx-auto max-w-[1320px] px-6 pt-15 pb-25 sm:px-10">
        <div className="rounded-[36px] bg-red px-6 py-[clamp(56px,8vw,104px)] text-center text-cream">
          <h2 className="font-display text-[clamp(38px,6vw,84px)] font-extrabold leading-[0.94] tracking-[-0.05em]">
            Know your number.
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[17px] text-cream/90">
            Let Salli&apos;s engine compute your 2025/26 tax from your real numbers, and explain
            every rule behind it.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <MagneticButton href="/pricing" className="rounded-full bg-cream px-8.5 py-4.5 text-[17px] font-bold text-ink">
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
