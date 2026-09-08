import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Reveal } from "@/components/Reveal";

/** Shared shell for the legal pages (Terms, Privacy, Security, Cookies). */
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
    <div className="relative">
      <Header />
      <article className="mx-auto max-w-[720px] px-6 pt-16 pb-25 sm:px-10">
        <div className="font-mono text-xs font-semibold uppercase tracking-[.14em] text-red-ink">Legal</div>
        <h1 className="mt-4 font-display text-[clamp(34px,4.6vw,56px)] font-extrabold leading-[1.0] tracking-[-0.04em]">
          {title}
        </h1>
        <p className="mt-3 font-mono text-[13px] text-ink-40">Last updated: {updated}</p>
        <Reveal className="article mt-10">{children}</Reveal>
      </article>
      <Footer />
    </div>
  );
}
