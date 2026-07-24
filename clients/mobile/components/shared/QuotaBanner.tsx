import { TriangleAlert } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

const METRIC_LABELS: Record<string, string> = {
  agent_messages: "AI messages",
  statement_uploads: "statement uploads",
  advisor_runs: "advisor runs",
};

/**
 * 402 quota_exceeded → amber banner with a tappable "Upgrade" CTA routing to the
 * Billing screen. Mobile mirror of the web QuotaBanner.
 */
export function QuotaBanner({ metric, className }: { metric?: string; className?: string }) {
  const router = useRouter();
  const label = (metric && METRIC_LABELS[metric]) || "quota";

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/more/billing")}
      className={`flex-row items-center gap-2 rounded-control border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 ${className ?? ""}`}
    >
      <TriangleAlert size={15} color="#d97706" strokeWidth={2} />
      <Text className="flex-1 text-[12px] text-foreground/70">
        Monthly {label} used up ·{" "}
        <Text className="font-sans-semibold text-primary underline">Upgrade</Text>
      </Text>
    </Pressable>
  );
}
