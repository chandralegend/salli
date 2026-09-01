import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Logo } from "@/components/Logo";
import { PillButton } from "@/components/ui/pill-button";
import { TextField } from "@/components/ui/text-field";
import { sendPasswordReset } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <View className="items-center pb-9">
        <Logo size={44} className="text-foreground" />
        <Text className="mt-[22px] font-sans-bold text-[30px] tracking-tight text-foreground">
          Forgot password?
        </Text>
        <Text className="mt-2.5 text-center text-[15px] text-foreground/45">
          We&apos;ll email you a link to reset it.
        </Text>
      </View>

      {sent ? (
        <View className="items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-salli-accent/20">
            <Mail size={22} color={colors.accent} strokeWidth={2} />
          </View>
          <Text className="text-center font-sans-semibold text-[18px] text-foreground">
            Check your inbox
          </Text>
          <Text className="text-center text-[15px] text-foreground/40">
            We&apos;ve sent a reset link to {email}.
          </Text>
          <PillButton className="mt-3 h-[54px] w-full" onPress={() => router.replace("/(auth)/login")}>
            Back to sign in
          </PillButton>
        </View>
      ) : (
        <View className="gap-2.5">
          <TextField
            className="rounded-[10px] px-[18px] py-[14px]"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />

          {error ? (
            <View className="rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-[15px] text-destructive">{error}</Text>
            </View>
          ) : null}

          <PillButton className="mt-1 h-[54px]" loading={loading} disabled={!email} onPress={handleSend}>
            Send reset link
          </PillButton>

          <Pressable className="items-center py-2" onPress={() => router.back()}>
            <Text className="text-[15px] text-foreground/40">Back to sign in</Text>
          </Pressable>
        </View>
      )}
    </AuthShell>
  );
}
