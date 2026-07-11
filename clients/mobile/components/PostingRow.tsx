import { View, Text } from "react-native";
import { useAppTheme } from "@/lib/theme";

interface PostingRowProps {
  date: string;
  description: string;
  account?: string;
  amount: string;
  isCredit: boolean;
  currency?: string;
  isLast?: boolean;
}

/** Mirrors clients/web/src/components/PostingRow.tsx */
export function PostingRow({
  date,
  description,
  account,
  amount,
  isCredit,
  currency = "LKR",
  isLast,
}: PostingRowProps) {
  const { isDark } = useAppTheme();
  const bg = isCredit ? (isDark ? "bg-emerald-950" : "bg-emerald-50") : isDark ? "bg-rose-950" : "bg-rose-50";
  const text = isCredit ? (isDark ? "text-emerald-400" : "text-emerald-700") : isDark ? "text-rose-400" : "text-rose-700";

  return (
    <View
      className={`flex-row items-center gap-3 py-2.5 ${isLast ? "" : "border-b border-border"}`}
    >
      <Text className="text-xs text-muted-foreground w-16 shrink-0 font-mono">{date}</Text>
      <View className="flex-1 min-w-0">
        <Text className="text-sm leading-tight text-foreground" numberOfLines={1}>
          {description}
        </Text>
        {account && (
          <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {account}
          </Text>
        )}
      </View>
      <View className={`px-1.5 py-0.5 rounded shrink-0 ${bg}`}>
        <Text className={`text-xs font-medium ${text}`}>{isCredit ? "CR" : "DR"}</Text>
      </View>
      <Text className={`font-mono text-[13px] font-medium w-24 text-right shrink-0 ${text}`}>
        <Text className="text-[11px] text-muted-foreground">{currency} </Text>
        {amount}
      </Text>
    </View>
  );
}
