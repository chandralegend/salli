import { View, Text } from "react-native";
import { useThemeColors, useColorScheme } from "@/lib/theme";

interface DeadlineChipProps {
  dueDate: string;
  done?: boolean;
}

function getDaysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function Chip({ bg, text, children }: { bg: string; text: string; children: React.ReactNode }) {
  return (
    <View className="rounded-md px-2 py-0.5 self-start" style={{ backgroundColor: bg }}>
      <Text className="text-[11px] font-medium" style={{ color: text }}>
        {children}
      </Text>
    </View>
  );
}

/** Mirrors clients/web/src/components/DeadlineChip.tsx */
export function DeadlineChip({ dueDate, done }: DeadlineChipProps) {
  const days = getDaysUntil(dueDate);
  const theme = useThemeColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  if (done) return <Chip bg={theme.muted} text={theme.mutedForeground}>Done</Chip>;
  if (days < 0) {
    return isDark
      ? <Chip bg="#4C0519" text="#FDA4AF">{Math.abs(days)}d overdue</Chip>
      : <Chip bg="#FFF1F2" text="#BE123C">{Math.abs(days)}d overdue</Chip>;
  }
  if (days === 0) {
    return isDark
      ? <Chip bg="rgba(232,252,133,0.15)" text={theme.primary}>Today</Chip>
      : <Chip bg="rgba(1,0,1,0.12)" text="#010001">Today</Chip>;
  }
  if (days <= 14) {
    return isDark
      ? <Chip bg="#451A03" text="#FCD34D">{days}d</Chip>
      : <Chip bg="#FFFBEB" text="#B45309">{days}d</Chip>;
  }
  return <Chip bg={theme.muted} text={theme.mutedForeground}>{days}d</Chip>;
}
