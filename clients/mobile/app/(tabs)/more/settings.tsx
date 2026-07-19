import { useRouter } from "expo-router";
import { AlertTriangle, Check, ChevronRight, Download, LogOut } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { ScreenHeader } from "@/components/ui/screen-header";
import { useEntitlements } from "@/hooks/useSettings";
import { useMore } from "@/hooks/useMore";
import { logout } from "@/lib/auth";
import { useDarkModeToggle, useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

const PLUS_FEATURES: { lead: string; rest: string }[] = [
  { lead: "500 AI messages/mo", rest: "25× Scrooge conversations" },
  { lead: "50 bank statement uploads", rest: "any Sri Lankan bank" },
  { lead: "Unlimited FIRE advisor", rest: "run your strategy anytime" },
];

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
  const { isDark, toggle } = useDarkModeToggle();
  const { profile } = useMore();
  const entitlements = useEntitlements();

  const isFree = entitlements.data?.plan === "free";
  const usage = entitlements.data?.usage ?? [];
  const messages = usage.find((u) => u.metric === "messages");
  const resetsAt = formatShortDate(usage[0]?.resets_at ?? entitlements.data?.current_period_end);

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
            {/* upgrade pitch */}
            <View style={{ backgroundColor: "#0A1040" }} className="px-4 pb-4 pt-[18px]">
              <Text className="mb-1 font-sans-bold text-[18px] text-white">Unlock Plus</Text>
              <Text className="mb-4 text-[13px] text-white/45">Everything you need to master your finances.</Text>
              <View className="mb-[18px] gap-2.5">
                {PLUS_FEATURES.map((f) => (
                  <View key={f.lead} className="flex-row items-start gap-2.5">
                    <View className="mt-px h-[18px] w-[18px] items-center justify-center rounded-full bg-white/[0.12]">
                      <Check size={9} color="#FFFFFF" strokeWidth={3} />
                    </View>
                    <Text className="flex-1 text-[13px] leading-[18px] text-white/70">
                      <Text className="font-sans-semibold text-white">{f.lead}</Text> — {f.rest}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => router.push("/(tabs)/more/billing")}
                className="h-[50px] flex-row items-center justify-center gap-1.5 rounded-pill bg-white"
              >
                <Text className="font-sans-bold text-[15px] text-black">Upgrade to Plus</Text>
                <Text className="text-[14px] text-black/40">· $9/mo</Text>
              </Pressable>
              <Text className="mt-2 text-center text-[11px] text-white/25">Cancel anytime · Secure checkout</Text>
            </View>
          </View>
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
