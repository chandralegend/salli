import { TriangleAlert } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

/**
 * 402 quota_exceeded → amber banner routing to Billing. Mobile mirror of the
 * web QuotaBanner.
 *
 * There is one balance now, so the per-metric label map is gone. The server
 * sends `cost` and `balance` instead, which is more useful than any label:
 * "needs 30 credits, you have 12" tells someone what to do about it.
 */
export function QuotaBanner({
  cost,
  balance,
  className,
}: {
  cost?: number;
  balance?: number;
  className?: string;
}) {
  const router = useRouter();
  const detail =
    typeof cost === "number" && typeof balance === "number" && cost > 0
      ? `Needs ${cost.toLocaleString()} credits, you have ${balance.toLocaleString()}`
      : "Out of AI credits";

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/more/billing")}
      className={`flex-row items-center gap-2 rounded-card border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 ${className ?? ""}`}
    >
      <TriangleAlert size={17} color="#d97706" strokeWidth={2} />
      <Text className="flex-1 text-[15px] text-foreground/70">
        {detail} ·{" "}
        {/* "Top up" is the web CTA; mobile has no purchase path, so promising
            one is both a dead end and — since the only way to act on it is off
            the app — steering. This routes to the balance, which is a thing
            mobile can actually show. */}
        <Text className="font-sans-semibold text-primary underline">See balance</Text>
      </Text>
    </Pressable>
  );
}
