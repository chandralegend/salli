import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { FadeIn } from "@/components/ui/fade-in";

/**
 * Shared shell for the legal pages (Terms, Privacy, Security, Cookies).
 * Plain server component — no client interactivity needed beyond the FadeIn
 * wrapper, which carries its own "use client" boundary.
 */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <Navbar />
      <article className="max-w-3xl mx-auto px-5 pt-32 pb-24 sm:pt-40">
        <FadeIn>
          <p className="t-eyebrow">Legal</p>
          <h1 className="t-h2 mt-3 text-foreground">{title}</h1>
          <p className="text-[13px] text-muted-foreground mt-3 font-ledger">
            Last updated: {updated}
          </p>
        </FadeIn>
        <FadeIn delay={0.08} className="legal-prose mt-10">
          {children}
        </FadeIn>
      </article>
      <SiteFooter />
    </main>
  );
}
