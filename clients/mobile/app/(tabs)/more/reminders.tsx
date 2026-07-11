import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Check } from "lucide-react-native";
import { ScreenShell, CardContainer } from "@/components/ui/page-shell";
import { DeadlineChip } from "@/components/DeadlineChip";
import { useReminders } from "@/hooks/useReminders";
import { useThemeColors } from "@/lib/theme";

export default function RemindersScreen() {
  const { reminders, markDone } = useReminders();
  const theme = useThemeColors();
  const data = (reminders.data ?? []).slice().sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <ScreenShell edges={["left", "right"]}>
      <CardContainer>
        {reminders.isLoading ? (
          <ActivityIndicator color={theme.foreground} />
        ) : data.length === 0 ? (
          <View className="items-center gap-2 py-8">
            <Text className="text-[13px] font-medium text-foreground">No reminders yet</Text>
            <Text className="text-[12px] text-muted-foreground">Seed the filing calendar from the web app</Text>
          </View>
        ) : (
          <View className="gap-2">
            {data.map((r) => (
              <View
                key={r.id}
                className="flex-row items-center justify-between p-3.5 rounded-2xl bg-muted"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-[14px] text-foreground" style={{ fontFamily: "DMSans_700Bold" }}>
                    {r.kind}
                  </Text>
                  <Text className="text-[12px] text-muted-foreground mt-0.5">
                    {new Date(r.due_date).toLocaleDateString("en-LK", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2.5">
                  <DeadlineChip dueDate={r.due_date} done={r.status === "done"} />
                  {r.status !== "done" && (
                    <Pressable
                      onPress={() => markDone.mutate(r.id)}
                      className="w-8 h-8 rounded-full bg-foreground items-center justify-center active:opacity-80"
                    >
                      <Check color={theme.background} size={16} />
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </CardContainer>
    </ScreenShell>
  );
}
