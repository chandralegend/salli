import { cn } from "@/lib/utils";
import { AppStoreBadge, PlayStoreBadge } from "@/components/ui/store-badges";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.salli.lk";

function Logo({ className = "size-7" }: { className?: string }) {
  // Sinhala rupee glyph "රු" — lime badge (pops on the dark site). Flex-centered
  // HTML rather than SVG dominant-baseline, which doesn't reliably center this
  // conjunct across browsers.
  return (
    <div
      className={cn(
        "@container relative shrink-0 select-none overflow-hidden rounded-[26%] bg-[#E8FC85] flex items-center justify-center",
        className,
      )}
      role="img"
      aria-label="Salli"
    >
      <span className="text-[#010001] font-black leading-none text-[48cqw] tracking-[-0.05em]">
        රු
      </span>
    </div>
  );
}

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "FI score", href: `${APP}/signup` },
      { label: "Tax engine", href: `${APP}/signup` },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "mailto:hello@salli.lk" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];

/**
 * Multi-column footer with a giant wordmark band. The oversized "salli"
 * lettering doubles as a graphic device so the foot of the page reads as
 * designed, not an afterthought.
 */
export function SiteFooter() {
  return (
    <footer className="relative border-t border-border bg-[#070807] overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo className="size-8" />
              <span className="text-[17px] font-bold tracking-tight text-foreground">Salli</span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-4 max-w-xs leading-relaxed">
              A real ledger, a Sri Lanka tax engine, and an AI wealth advisor — so you
              always know your tax, your net worth, and how close you are to freedom.
            </p>
            <a href={`${APP}/signup`} className="inline-flex items-center mt-6 text-[13px] font-bold px-5 h-10 rounded-full bg-[#E8FC85] text-[#010001] hover:brightness-95 transition-all">
              Get started free
            </a>
          </div>

          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/45">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/45">Get the app</p>
            <div className="mt-4 flex flex-col gap-2.5 items-start">
              <AppStoreBadge compact />
              <PlayStoreBadge compact />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-14 pt-6 border-t border-border">
          <p className="text-[12px] text-muted-foreground/60 font-ledger">
            © 2026 Salli · Finance &amp; Tax · Sri Lanka · All rights reserved.
          </p>
          <p className="text-[12px] text-muted-foreground/60">Built for Sri Lankan taxpayers · YA 2025/26</p>
        </div>
      </div>

      {/* Oversized wordmark */}
      <div aria-hidden className="select-none pointer-events-none -mb-6 sm:-mb-10">
        <p className="text-center font-black tracking-[-0.06em] leading-none text-transparent bg-clip-text"
           style={{
             fontSize: "clamp(5rem, 26vw, 22rem)",
             backgroundImage: "linear-gradient(180deg, rgba(232,252,133,0.14), rgba(232,252,133,0))",
           }}>
          salli
        </p>
      </div>
    </footer>
  );
}
