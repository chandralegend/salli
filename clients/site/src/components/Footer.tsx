import Link from "next/link";

import { Wordmark } from "@/components/Mark";

export function Footer() {
  return (
    <footer className="relative z-2 border-t-2 border-ink">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-start justify-between gap-9 px-6 py-13 sm:px-10">
        <div className="max-w-[300px]">
          <Wordmark size={24} />
          <p className="mt-3.5 text-[13.5px] leading-relaxed text-ink-50">
            Personal finance and tax, built for Sri Lanka. Numbers you can defend.
          </p>
        </div>
        <div className="flex flex-wrap gap-15">
          <FooterColumn
            title="Product"
            links={[
              { href: "/features", label: "Features" },
              { href: "/pricing", label: "Pricing" },
              { href: "/#engine", label: "Tax engine" },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: "/about", label: "About" },
              { href: "/blog", label: "Blog" },
              { href: "/#faq", label: "FAQ" },
              { href: "/support", label: "Support" },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
              { href: "/security", label: "Security" },
              { href: "/cookies", label: "Cookies" },
            ]}
          />
        </div>
      </div>
      <div className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-2 px-6 py-5 font-mono text-[11.5px] tracking-[.02em] text-ink-40 sm:px-10">
          <span>© 2026 Salli. All rights reserved.</span>
          <span>Not a licensed financial or investment advisor.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-2.5 font-mono text-[13.5px] text-ink-60">
      <span className="font-display text-[11px] font-bold uppercase tracking-[.08em] text-ink">
        {title}
      </span>
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-red">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
