/**
 * Display-only formatting for decimal-string money values.
 * API money is always a string — never parse to float for arithmetic.
 */

/** "1234567.5" → "1,234,567.50"; negatives render as "(1,234,567.50)". */
export function formatMoney(value: string | null | undefined, decimals = 2): string {
  if (value == null || value === "") return "—";
  let v = String(value).trim();
  const negative = v.startsWith("-") || (v.startsWith("(") && v.endsWith(")"));
  v = v.replace(/^[-(]|\)$/g, "");
  const [intRaw, fracRaw = ""] = v.split(".");
  const int = (intRaw || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = decimals > 0 ? "." + (fracRaw + "0".repeat(decimals)).slice(0, decimals) : "";
  const out = `${int}${frac}`;
  return negative ? `(${out})` : out;
}

/** Compact magnitude for stat cards: "3990000" → "3.99M". Display only. */
export function formatCompact(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  const fmt = (x: number) => x.toFixed(x >= 100 ? 0 : x >= 10 ? 1 : 2).replace(/\.0+$/, "");
  if (abs >= 1_000_000_000) return `${fmt(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${fmt(n / 1_000_000)}M`;
  if (abs >= 1_000) return `${fmt(n / 1_000)}K`;
  return fmt(n);
}

/** "2026-04-05" → "Apr 5, 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Days between today and an ISO date (negative = past). */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** Relative deadline label: "73d overdue" / "due in 12d" / "in 3 months". */
export function deadlineLabel(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "due today";
  if (days <= 60) return `due in ${days}d`;
  return `in ${Math.round(days / 30)} months`;
}

/** Sri Lanka assessment-year window (Apr 1 – Mar 31) containing `now`. */
export function assessmentYearRange(now = new Date()): { from: string; to: string; label: string } {
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from: `${y}-04-01`,
    to: `${y + 1}-03-31`,
    label: `${y}/${String(y + 1).slice(2)}`,
  };
}
