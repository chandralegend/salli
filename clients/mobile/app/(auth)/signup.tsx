import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AuthShell } from "@/components/auth/AuthShell";
import { Logo } from "@/components/Logo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { ActionButton } from "@/components/ui/action-button";
import { TextField } from "@/components/ui/text-field";
import { isSupabaseConfigured } from "@/lib/supabase";
import { signUpWithPassword } from "@/lib/auth";
import { useThemeColors } from "@/lib/theme";

export default function SignupScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUpWithPassword(email.trim(), password);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <View className="items-center pb-9">
        <Logo size={44} className="text-foreground" />
        <Text className="mt-[22px] font-sans-bold text-[30px] tracking-tight text-foreground">
          Create account
        </Text>
        <Text className="mt-2.5 text-center text-[15px] text-muted-foreground">
          Set up your Salli account to get started.
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
          <Text className="text-center text-[15px] text-muted-foreground">
            We&apos;ve sent a confirmation link to {email}.
          </Text>
          <ActionButton className="mt-3 h-[54px] w-full" onPress={() => router.replace("/(auth)/login")}>
            Back to sign in
          </ActionButton>
        </View>
      ) : (
        <View className="gap-2.5">
          {isSupabaseConfigured() ? <SocialAuthButtons onError={setError} /> : null}

          <TextField
            className="rounded-card px-[18px] py-[14px]"
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField
            className="rounded-card px-[18px] py-[14px]"
            label="Password"
            optionalHint="min 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="••••••••"
          />

          {error ? (
            <View className="rounded-card border border-destructive/30 bg-destructive/10 px-4 py-3">
              <Text className="text-[15px] text-destructive">{error}</Text>
            </View>
          ) : null}

          <ActionButton
            className="mt-1 h-[54px]"
            loading={loading}
            disabled={!email || !password}
            onPress={handleSignUp}
          >
            Create account
          </ActionButton>

          <Pressable className="items-center py-2" onPress={() => router.replace("/(auth)/login")}>
            <Text className="text-[15px] text-muted-foreground">
              Already have an account? <Text className="text-salli-accent">Sign in</Text>
            </Text>
          </Pressable>
        </View>
      )}
    </AuthShell>
  );
}
