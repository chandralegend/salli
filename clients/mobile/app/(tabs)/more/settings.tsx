import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { AlertTriangle, Bug, ChevronRight, Compass, Download, LogOut } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { BugReportDrawer } from "@/components/settings/BugReportDrawer";
import { LlmKeysCard } from "@/components/settings/LlmKeysCard";
import { McpConnectionsCard } from "@/components/settings/McpConnectionsCard";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import {
  useDailyBriefing,
  useDeleteAccount,
  useEntitlements,
  useExportData,
  useSetDailyBriefing,
} from "@/hooks/useSettings";
import { useMore } from "@/hooks/useMore";
import { logout } from "@/lib/auth";
import { confirmDestructive } from "@/lib/confirm";
import { useSalliStore } from "@/lib/store";
import { useThemeColors, useThemeMode } from "@/lib/theme";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function formatShortDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { mode, setMode } = useThemeMode();
  const dailyBriefing = useDailyBriefing();
  const setDailyBriefing = useSetDailyBriefing();
  const { profile } = useMore();
  const entitlements = useEntitlements();
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const startTour = useSalliStore((s) => s.startTour);
  const showToast = useToast();

  const isFree = entitlements.data?.plan === "free";

  const usage = entitlements.data?.usage ?? [];
  const messages = usage.find((u) => u.metric === "messages");
  const resetsAt = formatShortDate(usage[0]?.resets_at ?? entitlements.data?.current_period_end);

  async function handleSignOut() {
    await logout();
    router.replace("/(auth)/login");
  }

  async function handleExport() {
    try {
      const data = await exportData.mutateAsync();
      const file = new File(Paths.cache, "salli-export.json");
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Export my data",
          UTI: "public.json",
        });
      } else {
        showToast("Your data was exported, but sharing isn't available on this device.", "info");
      }
    } catch {
      showToast("Could not export your data right now. Please try again.", "error");
    }
  }

  function confirmDelete() {
    const email = profile?.email;
    if (!email) {
      Alert.alert(
        "Delete account",
        "We couldn't confirm your account email on this device. Please use the web app to delete your account.",
        [{ text: "OK" }],
      );
      return;
    }
    confirmDestructive({
      title: "Delete my account",
      message: `This permanently deletes all data for ${email}. This cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteAccount.mutateAsync(email);
          await logout();
          router.replace("/(auth)/login");
        } catch {
          Alert.alert("Delete failed", "Could not delete your account right now. Please try again.");
        }
      },
    });
  }

  return (
    <PageShell header={<ScreenHeader title="Settings" back />}>
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
          <View className="overflow-hidden rounded-card border border-foreground/10">
            {/* usage header */}
            <View style={{ backgroundColor: "#0E1A60" }} className="px-4 pb-4 pt-3.5">
              <View className="mb-2.5 flex-row items-center justify-between">
                <Text className="text-[12px] font-sans-medium text-white/60">
                  Free Plan{resetsAt ? ` · Resets ${resetsAt}` : ""}
                </Text>
                {messages ? (
                  <View className="rounded-pill bg-white/15 px-2.5 py-0.5">
                    <Text className="font-sans-bold text-[11px] text-white">⚠ {messages.remaining} messages left</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row flex-wrap gap-1.5">
                {usage.map((u) => {
                  const dim = u.remaining <= 0;
                  return (
                    <View
                      key={u.metric}
                      className={cn(
                        "flex-row items-center gap-1.5 rounded-pill px-3 py-1.5",
                        dim ? "bg-white/[0.06]" : "bg-white/10",
                      )}
                    >
                      <Text className={cn("text-[11px] capitalize", dim ? "text-white/30" : "text-white/50")}>
                        {u.metric.replace(/_/g, " ")}
                      </Text>
                      <Text className={cn("font-sans-bold text-[11px]", dim ? "text-white/40" : "text-white")}>
                        {u.used}/{u.limit}
                        {dim ? " used" : ""}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        <Card className="overflow-hidden p-0">
          <AnimatedPressable
            onPress={() => router.push("/onboarding")}
            className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3.5"
          >
            <Text className="font-sans-medium text-[14px] text-foreground">Redo profile setup</Text>
            <ChevronRight size={14} color={colors.mutedForeground} strokeWidth={2} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => {
              router.push("/(tabs)");
              startTour();
            }}
            className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3.5"
          >
            <Text className="font-sans-medium text-[14px] text-foreground">Take a tour</Text>
            <Compass size={14} color={colors.mutedForeground} strokeWidth={2} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setBugReportOpen(true)}
            className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3.5"
          >
            <Text className="font-sans-medium text-[14px] text-foreground">Report a bug</Text>
            <Bug size={14} color={colors.mutedForeground} strokeWidth={2} />
          </AnimatedPressable>
          <View className="flex-row items-center justify-between border-b border-foreground/[0.06] px-4 py-3.5">
            <View className="flex-1 pr-3">
              <Text className="font-sans-medium text-[14px] text-foreground">Daily briefing</Text>
              <Text className="mt-0.5 text-[11px] leading-4 text-foreground/35">
                A wealth-advisor run each morning. Uses one of your monthly advisor runs.
              </Text>
            </View>
            {dailyBriefing.isLoading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Pressable
                onPress={() => {
                  if (!setDailyBriefing.isPending) {
                    setDailyBriefing.mutate(!(dailyBriefing.data ?? false));
                  }
                }}
                disabled={setDailyBriefing.isPending}
                className="rounded-pill p-0.5"
                style={{
                  backgroundColor: dailyBriefing.data ? colors.accent : "rgba(128,128,128,0.25)",
                }}
              >
                <View className="h-[22px] w-[38px] justify-center">
                  <View
                    className="h-[18px] w-[18px] rounded-full bg-white"
                    style={{ marginLeft: dailyBriefing.data ? 18 : 2 }}
                  />
                </View>
              </Pressable>
            )}
          </View>
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <Text className="font-sans-medium text-[14px] text-foreground">Appearance</Text>
            <View className="flex-row rounded-pill bg-foreground/[0.08] p-0.5">
              {(
                [
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "Device" },
                ] as const
              ).map((opt) => {
                const active = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    className={cn("rounded-pill px-2.5 py-1.5", active && "bg-primary")}
                  >
                    <Text
                      className={cn(
                        "text-[12px]",
                        active ? "font-sans-semibold text-primary-foreground" : "font-sans-medium text-foreground/40",
                      )}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <LlmKeysCard />

        <McpConnectionsCard />

        <AnimatedPressable
          onPress={handleSignOut}
          className="flex-row items-center justify-between rounded-card border border-foreground/10 bg-card p-4"
        >
          <Text className="font-sans-medium text-[14px] text-foreground">Sign Out</Text>
          <LogOut size={16} color={colors.mutedForeground} strokeWidth={2} />
        </AnimatedPressable>

        <Card className="overflow-hidden p-0">
          <View className="px-4 pb-2 pt-3">
            <Text className="text-[10px] font-sans-semibold uppercase tracking-wide text-foreground/25">
              Danger Zone
            </Text>
          </View>
          <AnimatedPressable
            onPress={handleExport}
            disabled={exportData.isPending}
            className="flex-row items-center justify-between border-t border-foreground/[0.05] px-4 py-2.5"
          >
            <Text className="font-sans-medium text-[14px] text-foreground/60">Export my data</Text>
            {exportData.isPending ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Download size={14} color={colors.mutedForeground} strokeWidth={2} />
            )}
          </AnimatedPressable>
          <AnimatedPressable
            onPress={confirmDelete}
            disabled={deleteAccount.isPending}
            className="flex-row items-center justify-between border-t border-foreground/[0.05] px-4 py-2.5"
          >
            <Text className="font-sans-medium text-[14px] text-destructive/90">Delete my account</Text>
            {deleteAccount.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <AlertTriangle size={14} color="#EF4444" strokeWidth={2} />
            )}
          </AnimatedPressable>
        </Card>
      </View>

      <BugReportDrawer visible={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </PageShell>
  );
}
