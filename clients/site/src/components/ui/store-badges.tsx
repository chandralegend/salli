import { cn } from "@/lib/utils";

/**
 * App Store / Google Play badges — styled to read instantly as "the real
 * badge shape" but rendered as inert `<div>`s (no href, `cursor-default`)
 * since neither app is published yet. A small "Coming soon" pill replaces
 * the usual "Download on the" line so it never looks like a dead link.
 */
function BadgeShell({
  icon,
  eyebrow,
  label,
  className,
  compact = false,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  label: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-xl bg-white/[0.06] ring-1 ring-white/12 cursor-default select-none",
        compact ? "gap-2 h-11 px-3" : "gap-2.5 h-[52px] px-4",
        className,
      )}
      aria-disabled="true"
    >
      <span className="shrink-0 text-foreground/80">{icon}</span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-semibold text-muted-foreground tracking-wide", compact ? "text-[8.5px]" : "text-[10px]")}>{eyebrow}</span>
        <span className={cn("font-bold text-foreground mt-0.5", compact ? "text-[12px]" : "text-[15px]")}>{label}</span>
      </span>
    </div>
  );
}

function AppleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.014-.11-.03-.23-.03-.36 0-1.11.55-2.2 1.19-2.98.74-.94 2.01-1.6 3.04-1.65.03.13.05.27.05.4z" />
      <path d="M20.03 17.68c-.6 1.34-1.31 2.6-2.31 3.72-.87.98-1.83 2.06-3.1 2.06-1.26 0-1.62-.74-3.06-.74-1.44 0-1.86.72-3.06.74-1.28.03-2.24-1.05-3.13-2.03-1.9-2.1-3.36-5.94-1.4-8.55.97-1.3 2.7-2.13 4.42-2.13 1.3 0 2.24.72 3.06.72.79 0 1.86-.9 3.5-.77 2.06.15 3.35 1.02 4.06 2.28-1.86 1.13-2.9 2.9-2.6 4.9.27 1.73 1.31 3.2 2.62 3.9z" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M4.5 2.5v19a1 1 0 0 0 1.5.87l16-9.5a1 1 0 0 0 0-1.74l-16-9.5a1 1 0 0 0-1.5.87z" fill="currentColor" />
    </svg>
  );
}

export function AppStoreBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return <BadgeShell icon={<AppleGlyph />} eyebrow="Coming soon on the" label="App Store" className={className} compact={compact} />;
}

export function PlayStoreBadge({ className, compact }: { className?: string; compact?: boolean }) {
  return <BadgeShell icon={<PlayGlyph />} eyebrow="Coming soon on" label="Google Play" className={className} compact={compact} />;
}

export function StoreBadges({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <AppStoreBadge />
      <PlayStoreBadge />
    </div>
  );
}
