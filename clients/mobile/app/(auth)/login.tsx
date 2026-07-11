import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/text-field";
import { PillButton } from "@/components/ui/pill-button";
import { useAuth, signInWithPassword, isSupabaseConfigured } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const { isDark } = useAppTheme();
  const supabaseOn = isSupabaseConfigured();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      await signInWithPassword(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin() {
    await login("dev-seed-user");
    router.replace("/(tabs)");
  }

  return (
    <AuthShell title="Welcome back" subtitle="Your numbers are waiting.">
      <View className="gap-3">
        <TextField
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={supabaseOn}
        />
        <TextField
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={supabaseOn}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable className="self-end -mt-1">
            <Text className="text-muted-foreground text-[13px]">Forgot password?</Text>
          </Pressable>
        </Link>

        {!!error && (
          <View className={`${isDark ? "bg-rose-950 border-rose-900" : "bg-rose-50 border-rose-200"} border rounded-xl px-3 py-2.5`}>
            <Text className={`${isDark ? "text-rose-400" : "text-rose-600"} text-[12px]`}>{error}</Text>
          </View>
        )}

        <PillButton variant="primary" onPress={handleLogin} loading={loading} disabled={!supabaseOn}>
          Sign in
        </PillButton>
      </View>

      <View className="flex-row justify-center mt-4">
        <Text className="text-muted-foreground text-[13.5px]">New here? </Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable>
            <Text className="text-foreground font-bold text-[13.5px]">Create account</Text>
          </Pressable>
        </Link>
      </View>

      {!supabaseOn && (
        <View className="mt-5 border-t border-border/50 pt-4">
          <PillButton onPress={handleDevLogin}>Dev login (skip auth)</PillButton>
          <Text className="text-muted-foreground/60 text-[11px] text-center mt-2">
            Supabase isn&apos;t configured — using the local dev account.
          </Text>
        </View>
      )}
    </AuthShell>
  );
}
