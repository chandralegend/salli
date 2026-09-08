/**
 * Non-interactive stand-in for a mobile store button while the apps are
 * unreleased. Deliberately not a <button> or <a>: there is nothing to press, so
 * it stays out of the tab order and announces itself as disabled rather than
 * inviting a click that goes nowhere.
 *
 * Rendered wherever `MOBILE_APP_LIVE` is false: see src/lib/config.ts for the
 * one-flag revert on release.
 */
export function ComingSoonPill({
  children,
  icon,
  tone = "light",
  className = "",
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  /** `light` for cream sections, `dark` for the ink CTA band. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const toneClass =
    tone === "light" ? "border-ink/60 text-ink" : "border-cream/50 text-cream";
  return (
    <span
      aria-disabled="true"
      className={`inline-flex cursor-not-allowed items-center gap-2.5 rounded-card border-2 border-dashed px-6 py-3.5 text-[15px] font-bold ${toneClass} ${className}`}
    >
      {icon}
      {children}
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[.14em] opacity-80">
        soon
      </span>
    </span>
  );
}
