import { useRouter } from "expo-router";
import { AlertTriangle, ChevronRight, Download, LogOut } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useEntitlements } from "@/hooks/useSettings";
import { useMore } from "@/hooks/useMore";
import { logout } from "@/lib/auth";
import { useDarkModeToggle, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDark, toggle } = useDarkModeToggle();
  const { profile } = useMore();
  const entitlements = useEntitlements();

  const isFree = entitlements.data?.plan === "free";

  return (
    <PageShell>
      <ScreenHeader title="Settings" back />

      <View className="gap-2.5 px-4 pt-3">
        <Card className="flex-row items-center gap-3 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-salli-accent">
            <Text className="font-sans-bold text-[20px] text-white">
              {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-sans-semibold text-[15px] text-foreground">{profile?.display_name ?? "—"}</Text>
            <Text className="mt-0.5 text-[12px] text-foreground/35">{profile?.email ?? ""}</Text>
          </View>
          <View className="rounded-[8px] border border-foreground/10 bg-foreground/[0.06] px-2.5 py-1">
            <Text className="font-sans-semibold text-[11px] text-foreground/50 capitalize">
              {entitlements.data?.plan_name ?? "Free"}
            </Text>
          </View>
        </Card>

        {isFree ? (
          <Card className="overflow-hidden bg-salli-navy-card p-0">
            <View className="px-4 pb-4 pt-3.5">
              <View className="mb-2.5 flex-row items-center justify-between">
                <Text className="text-[12px] text-white/60">Free Plan</Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {(entitlements.data?.usage ?? []).map((u) => (
                  <View key={u.metric} className="flex-row items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1.5">
                    <Text className="text-[11px] capitalize text-white/50">{u.metric.replace(/_/g, " ")}</Text>
                    <Text className="font-sans-bold text-[11px] text-white">
                      {u.used}/{u.limit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="bg-salli-hero-2/40 px-4 pb-4 pt-4">
              <Text className="mb-1 font-sans-bold text-[18px] text-white">Unlock Plus</Text>
              <Text className="mb-3.5 text-[13px] text-white/45">Everything you need to master your finances.</Text>
              <Pressable
                onPress={() => router.push("/(tabs)/more/billing")}
                className="h-[50px] flex-row items-center justify-center gap-1.5 rounded-pill bg-white"
              >
                <Text className="font-sans-bold text-[15px] text-black">Upgrade to Plus</Text>
                <Text className="text-[14px] text-black/40">· $9/mo</Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <Card className="overflow-hidden p-0">
          <Pressable
            onPress={() => router.push("/onboarding")}
            className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3.5"
          >
            <Text className="font-sans-medium text-[14px] text-foreground">Redo profile setup</Text>
            <ChevronRight size={14} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className="font-sans-medium text-[14px] text-foreground">Appearance</Text>
            <View className="flex-row rounded-pill bg-foreground/[0.08] p-0.5">
              <Pressable onPress={() => !isDark && toggle()} className={cn("rounded-pill px-3.5 py-1.5", isDark && "bg-primary")}>
                <Text className={cn("text-[12px] font-sans-semibold", isDark ? "text-primary-foreground" : "text-foreground/40")}>
                  Dark
                </Text>
              </Pressable>
              <Pressable onPress={() => isDark && toggle()} className={cn("rounded-pill px-3.5 py-1.5", !isDark && "bg-primary")}>
                <Text className={cn("text-[12px] font-sans-medium", !isDark ? "text-primary-foreground" : "text-foreground/40")}>
                  Light
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>

        <Card
          onTouchEnd={async () => {
            await logout();
            router.replace("/(auth)/login");
          }}
          className="flex-row items-center justify-between p-4"
        >
          <Text className="font-sans-medium text-[14px] text-foreground">Sign Out</Text>
          <LogOut size={16} color={colors.mutedForeground} strokeWidth={2} />
        </Card>

        <Card className="overflow-hidden p-0">
          <View className="px-4 pb-2 pt-3">
            <Text className="text-[10px] font-sans-semibold uppercase tracking-wide text-foreground/25">
              Danger Zone
            </Text>
          </View>
          <Pressable className="flex-row items-center justify-between border-t border-foreground/[0.05] px-4 py-2.5">
            <Text className="font-sans-medium text-[14px] text-foreground/60">Export my data</Text>
            <Download size={14} color={colors.mutedForeground} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Delete account",
                "This permanently deletes all your data. This cannot be undone. Please use the web app to confirm this action.",
                [{ text: "OK" }],
              )
            }
            className="flex-row items-center justify-between border-t border-foreground/[0.05] px-4 py-2.5"
          >
            <Text className="font-sans-medium text-[14px] text-destructive/90">Delete my account</Text>
            <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
          </Pressable>
        </Card>
      </View>
    </PageShell>
  );
}
