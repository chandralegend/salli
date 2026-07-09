"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ── PageShell ─────────────────────────────────────────────────────────────────

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("px-8 py-7 max-w-[1560px] mx-auto", className)}>
      {children}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between mb-6 gap-5", className)}>
      <div>
        <h1 className="text-[38px] font-black tracking-[-0.05em] leading-[1.1] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-2 font-medium">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 pb-1">
          {actions}
        </div>
      )}
    </div>
  );
}

// ── IconAction ────────────────────────────────────────────────────────────────

interface IconActionProps {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}

export function IconAction({ onClick, title, children }: IconActionProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-[42px] h-[42px] bg-foreground text-background border-none rounded-xl cursor-pointer flex items-center justify-center hover:bg-foreground/85 transition-colors"
    >
      {children}
    </button>
  );
}

// ── PillButton ────────────────────────────────────────────────────────────────

interface PillButtonProps {
  variant?: "primary" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}

export function PillButton({
  variant = "secondary",
  onClick,
  disabled,
  children,
  className,
  type = "button",
}: PillButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-5 py-2.5 rounded-full text-[13.5px] font-bold transition-colors disabled:opacity-50",
        variant === "primary"
          ? "bg-foreground text-background hover:bg-foreground/85 border-none"
          : "bg-card text-foreground border border-border hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SectionTitle({ children, className, style }: SectionTitleProps) {
  return (
    <div className={cn("col-span-full pt-2 pb-1", className)} style={style}>
      <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

// ── CardContainer ─────────────────────────────────────────────────────────────

interface CardContainerProps {
  title?: string;
  titleRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: number | string;
  overflow?: string;
}

export function CardContainer({
  title,
  titleRight,
  children,
  className,
  style,
  padding = 24,
  overflow,
}: CardContainerProps) {
  return (
    <div
      className={cn("bg-card rounded-[20px]", className)}
      style={{ padding, overflow, ...style }}
    >
      {(title || titleRight) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <div className="text-[14px] font-extrabold tracking-[-0.02em] text-foreground">
              {title}
            </div>
          )}
          {titleRight && <div>{titleRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ── BentoTile ─────────────────────────────────────────────────────────────────

export type TileVariant = "mint" | "teal" | "lime" | "dark" | "card";
export type BadgeVariant = "green" | "amber" | "red" | "neutral";

const TILE_COLORS: Record<TileVariant, {
  bg: string; label: string; sub: string; value: string;
}> = {
  mint: { bg: "#A5FFB9", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  teal: { bg: "#D5E9EA", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  lime: { bg: "#E8FC85", label: "rgba(0,0,0,0.45)", sub: "rgba(0,0,0,0.35)", value: "#010001" },
  dark: { bg: "#010001", label: "rgba(255,255,255,0.3)", sub: "rgba(255,255,255,0.28)", value: "#E8FC85" },
  card: { bg: "var(--card)", label: "var(--muted-foreground)", sub: "var(--muted-foreground)", value: "var(--foreground)" },
};

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  green:   { bg: "#DCFCE7", text: "#16A34A" },
  amber:   { bg: "#FEF3C7", text: "#D97706" },
  red:     { bg: "#FEE2E2", text: "#DC2626" },
  neutral: { bg: "rgba(0,0,0,0.1)", text: "#010001" },
};

const DARK_NEUTRAL_BADGE = { bg: "rgba(255,255,255,0.12)", text: "#E8FC85" };

interface BentoTileProps {
  variant?: TileVariant;
  label: string;
  sub?: string;
  value: string;
  suffix?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: number;
  children?: React.ReactNode;
}

export function BentoTile({
  variant = "card",
  label,
  sub,
  value,
  suffix,
  badge,
  badgeVariant = "neutral",
  loading,
  onClick,
  className,
  style,
  minHeight = 160,
  children,
}: BentoTileProps) {
  const c = TILE_COLORS[variant];
  const isDark = variant === "dark";
  const rawBadge = BADGE_COLORS[badgeVariant];
  const badgeBg = isDark && badgeVariant === "neutral" ? DARK_NEUTRAL_BADGE.bg : rawBadge.bg;
  const badgeText = isDark && badgeVariant === "neutral" ? DARK_NEUTRAL_BADGE.text : rawBadge.text;

  return (
    <div
      className={cn(
        "rounded-[20px] flex flex-col justify-between transition-all",
        onClick && "cursor-pointer hover:brightness-[0.97]",
        className,
      )}
      style={{ background: c.bg, padding: 22, minHeight, ...style }}
      onClick={onClick}
    >
      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: c.label,
        }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: c.sub, marginTop: 3 }}>{sub}</div>
        )}
      </div>
      {loading ? (
        <Skeleton
          className="h-9 w-32"
          style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
        />
      ) : (
        <div>
          <div style={{
            fontSize: 34, fontWeight: 900, letterSpacing: "-0.05em",
            color: c.value, lineHeight: 1, marginBottom: 5,
          }}>
            {value}
            {suffix && <span style={{ fontSize: 18 }}>{suffix}</span>}
          </div>
          {badge && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
              background: badgeBg, color: badgeText,
            }}>
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
