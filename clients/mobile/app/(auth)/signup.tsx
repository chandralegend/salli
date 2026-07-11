import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Link, router } from "expo-router";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/text-field";
import { PillButton } from "@/components/ui/pill-button";
import { signUpWithPassword, isSupabaseConfigured } from "@/lib/auth";
import { useAppTheme } from "@/lib/theme";

export default function SignupScreen() {
  const { isDark } = useAppTheme();
  const supabaseOn = isSupabaseConfigured();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    setLoading(true);
    setError("");
    try {
      await signUpWithPassword(email, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Check your inbox" subtitle="We sent a confirmation link to finish creating your account.">
        <PillButton variant="primary" onPress={() => router.replace("/(auth)/login")}>
          Back to sign in
        </PillButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Track your money. Understand your tax.">
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

        {!!error && (
          <View className={`${isDark ? "bg-rose-950 border-rose-900" : "bg-rose-50 border-rose-200"} border rounded-xl px-3 py-2.5`}>
            <Text className={`${isDark ? "text-rose-400" : "text-rose-600"} text-[12px]`}>{error}</Text>
          </View>
        )}

        <PillButton variant="primary" onPress={handleSignup} loading={loading} disabled={!supabaseOn}>
          Create account
        </PillButton>
      </View>

      <View className="flex-row justify-center mt-4">
        <Text className="text-muted-foreground text-[13.5px]">Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="text-foreground font-bold text-[13.5px]">Sign in</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}
