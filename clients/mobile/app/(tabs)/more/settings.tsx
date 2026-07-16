import { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { router } from "expo-router";
import { Sun, Moon, X } from "lucide-react-native";
import { ScreenShell, CardContainer, SectionTitle } from "@/components/ui/page-shell";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/lib/auth";
import { useThemeColors, useDarkModeToggle, useThemeVars } from "@/lib/theme";
import { downloadDataExport, decodeEmailFromToken, useDeleteAccount } from "@/hooks/useDataPortability";

export default function SettingsScreen() {
  const { token, logout } = useAuth();
  const theme = useThemeColors();
  const { isDark, toggle } = useDarkModeToggle();
  const themeVars = useThemeVars();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();
  const accountEmail = decodeEmailFromToken(token);

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  async function handleExportData() {
    setExporting(true);
    setExportError(null);
    try {
      await downloadDataExport();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    try {
      await deleteAccount.mutateAsync(confirmEmail);
      setDeleteOpen(false);
      setConfirmEmail("");
      await logout();
      router.replace("/(auth)/login");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
    }
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
          <SectionTitle>Profile Setup</SectionTitle>
          <Text className="text-muted-foreground text-[13px] mb-3 leading-5">
            Your profile configures default accounts and personalises tax and FIRE calculations.
          </Text>
          <PillButton variant="secondary" onPress={() => router.push("/onboarding")} className="self-start">
            Redo profile setup
          </PillButton>
        </CardContainer>

        <CardContainer>
          <SectionTitle>Danger Zone</SectionTitle>
          <View className="gap-4">
            <View>
              <Text className="text-foreground text-[14px] mb-1" style={{ fontFamily: "DMSans_700Bold" }}>
                Export my data
              </Text>
              <Text className="text-muted-foreground text-[12.5px] mb-2.5 leading-[18px]">
                Download everything Salli has stored about you as one JSON file.
              </Text>
              <PillButton variant="secondary" onPress={handleExportData} loading={exporting} className="self-start">
                {exporting ? "Exporting…" : "Export my data"}
              </PillButton>
              {exportError && <Text className="text-destructive text-[12px] mt-1.5">{exportError}</Text>}
            </View>
            <View className="h-px bg-border" />
            <View>
              <Text className="text-[14px] mb-1" style={{ fontFamily: "DMSans_700Bold", color: "#DC2626" }}>
                Delete my account
              </Text>
              <Text className="text-muted-foreground text-[12.5px] mb-2.5 leading-[18px]">
                Permanently delete every row Salli has stored for you. This cannot be undone.
              </Text>
              <PillButton variant="destructive" onPress={() => setDeleteOpen(true)} className="self-start">
                Delete my account
              </PillButton>
            </View>
          </View>
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

      {/* ── Delete Account modal ── */}
      <Modal
        visible={deleteOpen}
        animationType="fade"
        transparent
        onRequestClose={() => { setDeleteOpen(false); setConfirmEmail(""); setDeleteError(null); }}
      >
        <View className="flex-1 items-center justify-center px-6" style={[themeVars, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View className="bg-background rounded-[24px] p-5 w-full max-w-[420px]">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-foreground" style={{ fontFamily: "DMSans_900Black", fontSize: 18, letterSpacing: -0.4 }}>
                Delete your account?
              </Text>
              <Pressable
                onPress={() => { setDeleteOpen(false); setConfirmEmail(""); setDeleteError(null); }}
                className="w-8 h-8 rounded-full items-center justify-center bg-muted"
              >
                <X color={theme.foreground} size={16} />
              </Pressable>
            </View>
            <Text className="text-[13px] text-muted-foreground leading-[19px] mb-4">
              This permanently deletes every row Salli has stored for you — accounts, entries,
              budgets, debts, holdings, policies, everything. This cannot be undone. Type your
              account email{accountEmail ? ` (${accountEmail})` : ""} to confirm.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TextField
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                className="mb-3"
              />
            </ScrollView>
            {deleteError && <Text className="text-destructive text-[12px] mb-2">{deleteError}</Text>}
            <View className="flex-row gap-2.5">
              <PillButton
                variant="secondary"
                onPress={() => { setDeleteOpen(false); setConfirmEmail(""); setDeleteError(null); }}
                className="flex-1"
              >
                Cancel
              </PillButton>
              <PillButton
                variant="destructive"
                onPress={handleDeleteAccount}
                loading={deleteAccount.isPending}
                disabled={!confirmEmail}
                className="flex-1"
              >
                Permanently delete
              </PillButton>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}
