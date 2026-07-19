/** Sri Lankan lakh/crore abbreviation, matching the mockup's "28.5L" / "3.6 Cr" / "48.6K" style. */
export function formatLKRAbbrev(value: string | number): string {
  const n = Math.abs(Number(value));
  const sign = Number(value) < 0 ? "-" : "";
  if (n >= 1e7) return `${sign}${(n / 1e7).toFixed(n >= 1e8 ? 0 : 1)} Cr`;
  if (n >= 1e5) return `${sign}${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${sign}${(n / 1e3).toFixed(1)}K`;
  return `${sign}${n.toFixed(0)}`;
}

/** Full comma-grouped LKR amount, e.g. "36,600" or "1,245,000.00". */
export function formatLKR(value: string | number, decimals = 2): string {
  const n = Number(value);
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPct(value: string | number, decimals = 1): string {
  return `${(Number(value) * 100).toFixed(decimals)}%`;
}
