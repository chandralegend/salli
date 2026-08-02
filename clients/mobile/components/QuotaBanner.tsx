import { Text, View } from "react-native";

/** Shared quota-exceeded banner — same visual treatment as the inline one on
 * the Salli AI chat screen, factored out so other AI-metered surfaces (Freedom
 * Mentor) don't duplicate it. */
export function QuotaBanner({ message }: { message: string }) {
  return (
    <View className="mb-2 rounded-control border border-destructive/25 bg-destructive/10 px-3.5 py-2.5">
      <Text className="text-[12px] text-destructive">{message}</Text>
    </View>
  );
}
