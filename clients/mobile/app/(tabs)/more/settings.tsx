import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Sun, Moon } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { useAuth } from "@/lib/auth";
import { useThemeColors, useDarkModeToggle } from "@/lib/theme";

export default function SettingsScreen() {
  const { token, logout } = useAuth();
  const theme = useThemeColors();
  const { isDark, toggle } = useDarkModeToggle();

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <ScreenShell edges={["left", "right"]}>
      <View className="gap-3">
        <CardContainer>
          <SectionTitle>Appearance</SectionTitle>
          <Pressable
            onPress={toggle}
            className="flex-row items-center justify-between py-1"
          >
            <Text className="text-foreground text-[14px]" style={{ fontFamily: "DMSans_700Bold" }}>
              {isDark ? "Dark mode" : "Light mode"}
            </Text>
            <View className="w-9 h-9 rounded-full bg-muted items-center justify-center">
              {isDark ? <Sun color={theme.foreground} size={17} /> : <Moon color={theme.foreground} size={17} />}
            </View>
          </Pressable>
        </CardContainer>

        <CardContainer>
          <SectionTitle>Session</SectionTitle>
          <Text className="text-muted-foreground text-[13px] mb-1">Signed in as</Text>
          <Text className="text-foreground text-[14px] mb-5" style={{ fontFamily: "DMSans_700Bold" }}>
            {token ? `${token.slice(0, 8)}…` : "—"}
          </Text>
          <PillButton variant="destructive" onPress={handleLogout} className="self-start">
            Sign out
          </PillButton>
        </CardContainer>

        <CardContainer>
          <SectionTitle>About</SectionTitle>
          <Text className="text-muted-foreground text-[13px] leading-5">
            Salli tracks your money and tax, right from your pocket — ledger, tax computation,
            Financial Independence planning, the Scrooge AI agent, statement uploads, and documents
            all work here, in sync with the web app.
          </Text>
        </CardContainer>
      </View>
    </ScreenShell>
  );
}
