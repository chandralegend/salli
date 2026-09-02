import { Text, View } from "react-native";

import { cn } from "../../lib/utils";

/**
 * `.chip` from the mockup: a mono, 12px/700 code tag with a 1.5px ink border.
 *
 * Debit is lavender and credit is accent, which is not decoration — it is the
 * one place in the app where the two sides of an entry have to be told apart at
 * a glance, and the ledger rows previously did it with the truncated sentence
 * "DR: Insurance – Health (Ceylinco) · CR: People's Bank…". That line was
 * unreadable at row width and hid the account codes entirely.
 *
 * 1.5px rather than the 2px container border: at 20px tall a 2px edge makes a
 * tag look like a button.
 */
export function PostingChip({
  side,
  code,
  className,
}: {
  side: "DR" | "CR";
  code?: string | null;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center gap-1 rounded-badge border-[1.5px] border-foreground px-2 py-0.5",
        side === "DR" ? "bg-salli-ai" : "bg-salli-accent",
        className,
      )}
    >
      {/* Black on lavender and white on orange — both fills are
          theme-invariant, so an ink-derived colour would invert into them. */}
      <Text
        className="font-mono text-[12px]"
        style={{ color: side === "DR" ? "#000000" : "#FFFFFF" }}
      >
        {side}
        {code ? ` ${code}` : ""}
      </Text>
    </View>
  );
}
