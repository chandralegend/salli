import { cn } from "@/lib/utils";

// ── GlassPanel ────────────────────────────────────────────────────────────────
// Frosted-glass surface primitive. Use sparingly — for the main shell, header
// action buttons, popovers, and list/table containers. Don't stack glass on
// glass; nested components should use a translucent solid fill instead.

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassPanel({ children, className, style }: GlassPanelProps) {
  return (
    <div className={cn("glass-surface rounded-[var(--radius-panel)]", className)} style={style}>
      {children}
    </div>
  );
}
