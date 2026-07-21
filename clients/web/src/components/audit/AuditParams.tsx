import { formatMoney } from "@/lib/format";

/** Keys whose values are money-ish amounts and should render with thousands separators. */
const MONEY_KEYS = /(amount|balance|total|value|price|cost|income|salary|relief|credit|tax|payment|minor_units)/i;

function renderValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number" && MONEY_KEYS.test(key)) {
    return formatMoney(String(value));
  }
  if (typeof value === "string" && MONEY_KEYS.test(key) && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return formatMoney(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/** Renders a tool-call params object as compact key/value rows. */
export function AuditParams({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-2">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-xs capitalize text-muted-foreground">{key.replace(/_/g, " ")}</dt>
          <dd className="truncate text-right font-mono text-xs text-foreground/80" title={renderValue(key, value)}>
            {renderValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
