import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/text-field";
import { PillButton } from "@/components/ui/pill-button";
import { sendPasswordReset, isSupabaseConfigured } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const { isDark } = useAppTheme();
  const supabaseOn = isSupabaseConfigured();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSend() {
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send reset email");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="We sent a password reset link to your email.">
        <PillButton variant="primary" onPress={() => router.replace("/(auth)/login")}>
          Back to sign in
        </PillButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <View className="gap-3">
        <TextField
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={supabaseOn}
        />

        {!!error && (
          <View className={`${isDark ? "bg-rose-950 border-rose-900" : "bg-rose-50 border-rose-200"} border rounded-xl px-3 py-2.5`}>
            <Text className={`${isDark ? "text-rose-400" : "text-rose-600"} text-[12px]`}>{error}</Text>
          </View>
        )}

        <PillButton variant="primary" onPress={handleSend} loading={loading} disabled={!supabaseOn}>
          Send reset link
        </PillButton>
      </View>
    </AuthShell>
  );
}
