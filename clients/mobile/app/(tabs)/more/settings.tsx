import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Bug, ChevronRight, Compass, Download, LogOut, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";

import { BugReportDrawer } from "@/components/settings/BugReportDrawer";
import { LlmKeysCard } from "@/components/settings/LlmKeysCard";
import { McpConnectionsCard } from "@/components/settings/McpConnectionsCard";
import { ModelPickerCard } from "@/components/settings/ModelPickerCard";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Rule, SectionLabel } from "@/components/ui/blocks";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useMore } from "@/hooks/useMore";
import {
  useDailyBriefing,
  useDeleteAccount,
  useEntitlements,
  useExportData,
  useSetDailyBriefing,
} from "@/hooks/useSettings";
import { logout } from "@/lib/auth";
import { confirmDestructive } from "@/lib/confirm";
import { useSalliStore } from "@/lib/store";
import { useHardShadow, useThemeColors, useThemeMode } from "@/lib/theme";
import { useToast } from "@/lib/toast";

/** One tappable settings row: label, optional description, trailing glyph. */
function Row({
  label,
  description,
  onPress,
  trailing,
  danger,
  disabled,
}: {
  label: string;
  description?: string;
  onPress: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      press="sink"
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center gap-3 rounded-card border-2 bg-card px-3.5 py-3 ${
        danger ? "border-destructive" : "border-foreground"
      }`}
    >
      <View className="min-w-0 flex-1">
        <Text
          className={`font-sans-bold text-[16px] ${danger ? "text-destructive" : "text-foreground"}`}
        >
          {label}
        </Text>
        {description ? (
          <Text className="mt-0.5 text-[13.5px] leading-[19px] text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
    </AnimatedPressable>
  );
}

/**
 * Settings, in one scroll — and the entry point to Billing.
 *
 * Billing used to be a tile in the More grid. It belongs with the account,
 * which is what this screen is, so it is a row here instead.
 *
 * That move also removed a genuine duplication. Settings carried its own
 * free-plan usage panel — a hardcoded `#0E1A60` navy block left over from the
 * palette before this one — that stated the credit balance three ways (a
 * "credits left" pill, an "Allowance x / y" chip and a "Purchased n" chip)
 * while Billing stated the same balance four more ways one tap away. The Plan
 * row below shows the balance once and links to the screen that owns it.
 *
 * The panel also only rendered for free-plan users, so a paying subscriber
 * opening Settings saw no balance at all.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const shadow = useHardShadow();
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

  // `credits.total` is allowance + purchased, which is what can actually be
  // spent — allowance alone reads as empty for a topped-up user.
  const credits = entitlements.data?.credits;

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
      {/* Identity, stated once. The avatar had `bg-card` with `text-white` —
          white on white, i.e. invisible, in light mode. Same bug the More
          screen's avatar had; both came from one accent-circle sweep. */}
      <View className="flex-row items-center gap-3.5 px-5">
        <View className="h-14 w-14 items-center justify-center rounded-[13px] border-2 border-foreground bg-salli-accent">
          <Text className="font-sans-extrabold text-[24px] text-white">
            {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-sans-extrabold text-[19px] text-foreground">
            {profile?.display_name ?? "—"}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[14px] text-muted-foreground">
            {profile?.email ?? ""}
          </Text>
        </View>
      </View>

      <Rule />

      <SectionLabel>Plan</SectionLabel>
      <View className="mt-3 px-5">
        <Row
          label={entitlements.data?.plan_name ?? "Free"}
          description={
            credits
              ? `${credits.total.toLocaleString()} credits available`
              : "Plan, credits and top-ups"
          }
          onPress={() => router.push("/(tabs)/more/billing")}
          trailing={<ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2} />}
        />
      </View>

      <Rule />

      <SectionLabel>Preferences</SectionLabel>
      <View className="mt-3 gap-[9px] px-5">
        <View className="rounded-card border-2 border-foreground bg-card px-3.5 py-3" style={shadow}>
          <Text className="font-sans-bold text-[16px] text-foreground">Appearance</Text>
          {/* SegmentedControl, not a hand-rolled pill row. This was the last
              place in the app still drawing its own version of that control. */}
          <SegmentedControl
            className="mt-2.5"
            options={["light", "dark", "system"] as const}
            value={mode}
            onChange={setMode}
            capitalize
          />
        </View>

        <View
          className="flex-row items-center gap-3 rounded-card border-2 border-foreground bg-card px-3.5 py-3"
          style={shadow}
        >
          <View className="min-w-0 flex-1">
            <Text className="font-sans-bold text-[16px] text-foreground">Daily briefing</Text>
            <Text className="mt-0.5 text-[13.5px] leading-[19px] text-muted-foreground">
              A wealth-advisor run each morning. Spends credits from your balance.
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
              accessibilityRole="switch"
              accessibilityState={{ checked: Boolean(dailyBriefing.data) }}
              accessibilityLabel="Daily briefing"
              className="h-[26px] w-[46px] shrink-0 justify-center rounded-pill border-2 border-foreground p-0.5"
              style={{
                backgroundColor: dailyBriefing.data ? colors.accent : colors.muted,
              }}
            >
              {/* 16, not 20. The track is 46 wide; its 2px border and 2px
                  padding leave 38 of usable width, and the thumb with its own
                  border is 22 — so the far edge is 38 − 22 = 16. At 20 the
                  thumb pushed 4px past the end of its own track. */}
              <View
                className="h-[18px] w-[18px] rounded-full border-2 border-foreground bg-card"
                style={{ marginLeft: dailyBriefing.data ? 16 : 0 }}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Rule />

      <SectionLabel>Salli</SectionLabel>
      <View className="mt-3 gap-[9px] px-5">
        <ModelPickerCard />
        <LlmKeysCard />
        <McpConnectionsCard />
      </View>

      <Rule />

      <SectionLabel>Help</SectionLabel>
      <View className="mt-3 gap-[9px] px-5">
        <Row
          label="Take a tour"
          description="Walk through the app again"
          onPress={() => {
            router.push("/(tabs)");
            startTour();
          }}
          trailing={<Compass size={18} color={colors.mutedForeground} strokeWidth={2} />}
        />
        <Row
          label="Redo profile setup"
          description="Re-answer the onboarding questions"
          onPress={() => router.push("/onboarding")}
          trailing={<ChevronRight size={18} color={colors.mutedForeground} strokeWidth={2} />}
        />
        <Row
          label="Report a bug"
          onPress={() => setBugReportOpen(true)}
          trailing={<Bug size={18} color={colors.mutedForeground} strokeWidth={2} />}
        />
      </View>

      <Rule />

      {/* Export is not a dangerous action. It used to sit under a "Danger Zone"
          heading beside account deletion, which is how a backup got framed as a
          risk. */}
      <SectionLabel>Your data</SectionLabel>
      <View className="mt-3 gap-[9px] px-5">
        <Row
          label="Export my data"
          description="Everything Salli holds, as one JSON file"
          onPress={handleExport}
          disabled={exportData.isPending}
          trailing={
            exportData.isPending ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Download size={18} color={colors.mutedForeground} strokeWidth={2} />
            )
          }
        />
        <Row
          label="Sign out"
          onPress={handleSignOut}
          trailing={<LogOut size={18} color={colors.mutedForeground} strokeWidth={2} />}
        />
        <Row
          label="Delete my account"
          description="Permanently removes everything. This cannot be undone."
          onPress={confirmDelete}
          disabled={deleteAccount.isPending}
          danger
          trailing={
            deleteAccount.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Trash2 size={18} color="#EF4444" strokeWidth={2} />
            )
          }
        />
      </View>
      <View className="h-7" />

      <BugReportDrawer visible={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </PageShell>
  );
}
